"""
Naukri scraper (async Playwright).

Naukri is a JS-heavy SPA behind Akamai bot detection. Uses Playwright's async
API with anti-detection flags so it runs cleanly inside the FastAPI event loop.
"""

import re
import asyncio
import logging

from app.scrapers.base import BaseScraper, ParsedQuery, RawJobListing

logger = logging.getLogger(__name__)

_BASE_URL = "https://www.naukri.com"
_CARD_SELECTOR = ".srp-jobtuple-wrapper"
_JOBS_PER_PAGE = 20
_PAGE_DELAY_MS = 2000


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")


class NaukriScraper(BaseScraper):
    source_name = "naukri"

    async def scrape(self, query: ParsedQuery, limit: int = 20, pages: int = 3):
        # Playwright's async browser launch needs a subprocess-capable event
        # loop. On Windows, uvicorn may run a Selector loop (no subprocess
        # support), so we run the whole Playwright session in a dedicated
        # thread that owns its own Proactor event loop. This makes Naukri work
        # regardless of the server's loop policy.
        import asyncio as _asyncio
        import sys as _sys

        def _runner():
            if _sys.platform == "win32":
                loop = _asyncio.ProactorEventLoop()
            else:
                loop = _asyncio.new_event_loop()
            _asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(self._scrape_async(query, limit, pages))
            finally:
                loop.close()

        return await _asyncio.to_thread(_runner)

    async def _scrape_async(self, query: ParsedQuery, limit: int = 20, pages: int = 3):
        try:
            from playwright.async_api import async_playwright, Error as PlaywrightError
        except ImportError:
            print("[Naukri] Playwright not installed. Skipping.")
            return []

        job_title = query.role
        location = query.location
        all_listings: list[RawJobListing] = []
        seen_keys: set[str] = set()
        max_pages = max(pages, -(-limit // _JOBS_PER_PAGE) * 2)

        try:
            async with async_playwright() as pw:
                browser = await self._launch(pw, PlaywrightError)
                context = await browser.new_context(
                    user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                "AppleWebKit/537.36 (KHTML, like Gecko) "
                                "Chrome/126.0.0.0 Safari/537.36"),
                    viewport={"width": 1366, "height": 768},
                    locale="en-IN",
                    timezone_id="Asia/Kolkata",
                )
                try:
                    page = await context.new_page()
                    await page.add_init_script(
                        "Object.defineProperty(navigator,'webdriver',{get:()=>undefined});"
                        "Object.defineProperty(navigator,'plugins',{get:()=>[1,2,3]});"
                        "Object.defineProperty(navigator,'languages',{get:()=>['en-US','en','hi']});"
                        "window.chrome={runtime:{}};"
                    )
                    for page_num in range(1, max_pages + 1):
                        if len(all_listings) >= limit:
                            break
                        url = self._build_url(job_title, page_num, location)
                        print(f"[Naukri] page {page_num}: {url}")
                        listings = await self._scrape_page(page, url, page_num)
                        if not listings:
                            break
                        new = []
                        for lst in listings:
                            key = (lst.url or "").lower() or f"{lst.title.lower()}|{lst.company.lower()}"
                            if key in seen_keys:
                                continue
                            seen_keys.add(key)
                            new.append(lst)
                        if not new:
                            break
                        all_listings.extend(new[: max(0, limit - len(all_listings))])
                        if page_num < max_pages and len(all_listings) < limit:
                            await page.wait_for_timeout(_PAGE_DELAY_MS)
                    # Enrich each job with its full Job Description from the
                    # detail page (the list page only has a short snippet).
                    await self._enrich_descriptions(page, all_listings)
                finally:
                    await browser.close()
        except Exception as exc:
            print(f"[Naukri] error: {exc}")

        logger.info("Naukri: %s jobs for %r", len(all_listings), job_title)
        print(f"[Naukri] returned {len(all_listings)} jobs")
        return all_listings

    async def _launch(self, pw, PlaywrightError):
        args = ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        # Prefer real Google Chrome (headless) - most reliable against Naukri's
        # Akamai bot protection. Fall back to bundled Chromium only if installed.
        try:
            return await pw.chromium.launch(channel="chrome", headless=True, args=args)
        except PlaywrightError as exc:
            print(f"[Naukri] Chrome channel unavailable ({exc}); trying bundled Chromium.")
            try:
                return await pw.chromium.launch(headless=True, args=args)
            except PlaywrightError as exc2:
                raise RuntimeError(
                    "Naukri needs Google Chrome or a Playwright browser. "
                    "Install Chrome, or run: python -m playwright install chromium. "
                    f"({exc2})"
                ) from exc2

    async def _enrich_descriptions(self, page, listings):
        """Visit each job's detail page to capture the full Job Description."""
        for lst in listings:
            if not lst.url:
                continue
            try:
                await page.goto(lst.url, timeout=30000)
                await page.wait_for_timeout(1500)
                jd = await page.inner_text(
                    "section.styles_job-desc-container__txpYf", timeout=8000
                )
                if jd and len(jd.strip()) > len((lst.description or "")):
                    lst.description = jd.strip()[:8000]
            except Exception as exc:
                # Keep the snippet if the detail page fails
                print(f"[Naukri] JD fetch failed for {lst.url[:60]}: {exc}")
                continue

    @staticmethod
    def _build_url(job_title, page, location):
        url = f"{_BASE_URL}/{_slugify(job_title)}-jobs"
        if location and location.lower() != "remote":
            url += f"-in-{_slugify(location)}"
        if page > 1:
            url += f"-{page}"
        return url

    async def _scrape_page(self, page, url, page_num):
        try:
            resp = await page.goto(url, timeout=30000)
            if resp and resp.status == 403:
                print("[Naukri] 403 Forbidden (IP likely blocked).")
                return []
            try:
                await page.wait_for_selector(_CARD_SELECTOR, timeout=15000)
            except Exception:
                print(f"[Naukri] no job cards on page {page_num}")
                return []
            await page.wait_for_timeout(2000)
            return await self._extract(page)
        except Exception as exc:
            print(f"[Naukri] page {page_num} failed: {exc}")
            return []

    async def _extract(self, page):
        raw_jobs = await page.evaluate(
            """
            () => {
                const wrappers = document.querySelectorAll('.srp-jobtuple-wrapper');
                return Array.from(wrappers).map(w => {
                    const card = w.querySelector('.cust-job-tuple') || w;
                    const titleEl = card.querySelector('a.title');
                    const title = titleEl ? titleEl.textContent.trim() : '';
                    const url = titleEl ? titleEl.href : '';
                    const compEl = card.querySelector('a.comp-name, .comp-name');
                    const company = compEl ? compEl.textContent.trim() : '';
                    const locEl = card.querySelector('.locWdth, .loc-wrap .ellipsis, .loc-wrap span');
                    const location = locEl ? locEl.textContent.trim() : '';
                    const salEl = card.querySelector('.sal-wrap span, .ni-job-tuple-icon-salary + span');
                    let salary = salEl ? salEl.textContent.trim() : '';
                    if (/not\\s*disclos/i.test(salary)) salary = '';
                    const descEl = card.querySelector('.job-desc, .job-description, .tuple-desc');
                    const description = descEl ? descEl.textContent.trim() : '';
                    const skillEls = card.querySelectorAll('.tags-gt .tag-li, .tag-li, .job-tags span');
                    const skills = Array.from(skillEls).map(el => el.textContent.trim()).filter(Boolean).slice(0, 10);
                    const logoEl = card.querySelector('img.logoImage, img.comp-logo, .comp-logo img, img[src*="companyLogo"], img[title]');
                    const companyLogoUrl = logoEl ? (logoEl.getAttribute('src') || logoEl.getAttribute('data-src') || '') : '';
                    return { title, url, company, location, salary, description, skills, companyLogoUrl };
                }).filter(j => j.title);
            }
            """
        )
        listings = []
        for j in raw_jobs:
            listings.append(RawJobListing(
                title=j.get("title", ""),
                company=j.get("company", ""),
                location=j.get("location") or None,
                salary_range=j.get("salary") or None,
                description=(j.get("description") or "")[:5000],
                url=j.get("url", ""),
                source=self.source_name,
                company_logo_url=(j.get("companyLogoUrl") or None),
                tags=j.get("skills") or [],
                posted_at=None,
            ))
        return listings
