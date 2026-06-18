"""
Wellfound scraper (async Playwright).

Migrated from Firecrawl to Playwright to bypass Cloudflare/JS challenges.
Uses Playwright's async API with anti-detection flags.
"""

import re
import asyncio
import logging

from app.scrapers.base import BaseScraper, ParsedQuery, RawJobListing
from app.scrapers.matching import title_matches_role

logger = logging.getLogger(__name__)

_BASE_URL = "https://wellfound.com"
_PAGE_DELAY_MS = 2000

def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")

def _clean_loc(value: str) -> str:
    value = "".join((ch if ord(ch) < 128 else " - ") for ch in value)
    return re.sub(r"\s+", " ", value).strip(" -")

class WellfoundScraper(BaseScraper):
    source_name = "wellfound"

    async def scrape(self, query: ParsedQuery, limit: int = 20, pages: int = 1):
        import asyncio as _asyncio
        import sys as _sys

        def _runner():
            if _sys.platform == "win32":
                loop = _asyncio.ProactorEventLoop()
            else:
                loop = _asyncio.new_event_loop()
            _asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(self._scrape_async(query, limit))
            finally:
                loop.close()

        return await _asyncio.to_thread(_runner)

    async def _scrape_async(self, query: ParsedQuery, limit: int = 20):
        try:
            from playwright.async_api import async_playwright, Error as PlaywrightError
        except ImportError:
            print("[Wellfound] Playwright not installed. Skipping.")
            return []

        job_title = query.role
        location = query.location
        url = self._build_url(job_title, location)
        
        all_listings: list[RawJobListing] = []
        
        try:
            async with async_playwright() as pw:
                browser = await self._launch(pw, PlaywrightError)
                context = await browser.new_context(
                    user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                "AppleWebKit/537.36 (KHTML, like Gecko) "
                                "Chrome/126.0.0.0 Safari/537.36"),
                    viewport={"width": 1366, "height": 768},
                    locale="en-US",
                )
                try:
                    page = await context.new_page()
                    await page.add_init_script(
                        "Object.defineProperty(navigator,'webdriver',{get:()=>undefined});"
                        "Object.defineProperty(navigator,'plugins',{get:()=>[1,2,3]});"
                        "Object.defineProperty(navigator,'languages',{get:()=>['en-US','en']});"
                        "window.chrome={runtime:{}};"
                    )
                    
                    print(f"[Wellfound] scraping url: {url}")
                    resp = await page.goto(url, timeout=45000)
                    
                    if resp and resp.status == 403:
                        print("[Wellfound] 403 Forbidden (JS challenge failed or IP blocked).")
                        return []
                        
                    await page.wait_for_timeout(3000)
                    
                    # Try to extract job listings
                    raw_jobs = await page.evaluate(
                        """
                        () => {
                            const jobs = [];
                            // Wellfound uses various classes for job listings, often looking for anchor tags with /jobs/
                            const jobLinks = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));
                            
                            // Deduplicate by URL
                            const uniqueLinks = [...new Map(jobLinks.map(item => [item.href, item])).values()];
                            
                            for (const link of uniqueLinks) {
                                // Walk up the DOM to find the container card
                                let card = link.closest('div.styles_result__XXXX') || link.closest('div[class*="component"]') || link.parentElement.parentElement;
                                
                                const title = link.textContent.trim();
                                if (!title || title.length < 3) continue;
                                
                                // Try to find company name near the job link
                                let companyEl = card.querySelector('a[href*="/company/"]');
                                const company = companyEl ? companyEl.textContent.trim() : "Unknown Company";
                                
                                const url = link.href;
                                
                                jobs.push({
                                    title,
                                    company,
                                    url,
                                    location: "Remote", // Defaulting to remote
                                    salary: "",
                                    description: title + " at " + company
                                });
                            }
                            return jobs;
                        }
                        """
                    )
                    
                    for j in raw_jobs:
                        if title_matches_role(j.get("title", ""), job_title):
                            all_listings.append(RawJobListing(
                                title=j.get("title", ""),
                                company=j.get("company", ""),
                                location=j.get("location") or "Remote",
                                salary_range=j.get("salary") or None,
                                description=(j.get("description") or "")[:5000],
                                url=j.get("url", ""),
                                source=self.source_name,
                                company_logo_url=None,
                                tags=[],
                                posted_at=None,
                            ))
                            
                    all_listings = all_listings[:limit]
                    
                    # Enrich descriptions by visiting individual job pages
                    await self._enrich_descriptions(page, all_listings)
                    
                finally:
                    await browser.close()
        except Exception as exc:
            print(f"[Wellfound] error: {exc}")

        logger.info("Wellfound: %s jobs for %r", len(all_listings), job_title)
        print(f"[Wellfound] returned {len(all_listings)} jobs")
        return all_listings

    async def _launch(self, pw, PlaywrightError):
        args = ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        try:
            return await pw.chromium.launch(channel="chrome", headless=True, args=args)
        except PlaywrightError as exc:
            print(f"[Wellfound] Chrome channel unavailable ({exc}); trying bundled Chromium.")
            try:
                return await pw.chromium.launch(headless=True, args=args)
            except PlaywrightError as exc2:
                raise RuntimeError(
                    "Wellfound needs Google Chrome or a Playwright browser. "
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
                await page.wait_for_timeout(2000)
                
                # Check for "About the role" or "About the job" headers
                jd = await page.evaluate("""
                    () => {
                        const headers = Array.from(document.querySelectorAll('h2, h3, h4'));
                        const aboutHeader = headers.find(h => 
                            h.textContent.toLowerCase().includes('about the role') || 
                            h.textContent.toLowerCase().includes('about the job') ||
                            h.textContent.toLowerCase().includes('responsibilities')
                        );
                        
                        if (aboutHeader && aboutHeader.parentElement) {
                            return aboutHeader.parentElement.innerText;
                        }
                        
                        // Fallback: just grab the main body
                        const main = document.querySelector('main');
                        return main ? main.innerText : document.body.innerText;
                    }
                """)
                
                if jd and len(jd.strip()) > len((lst.description or "")):
                    lst.description = jd.strip()[:8000]
            except Exception as exc:
                print(f"[Wellfound] JD fetch failed for {lst.url[:60]}: {exc}")
                continue

    @staticmethod
    def _build_url(job_title, location):
        slug = _slugify(job_title)
        if location and location.lower() != "remote":
            return f"{_BASE_URL}/role/l/{slug}/{_slugify(location)}"
        return f"{_BASE_URL}/role/r/{slug}"
