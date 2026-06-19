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
        from app.config import settings

        def _runner():
            if _sys.platform == "win32":
                loop = _asyncio.ProactorEventLoop()
            else:
                loop = _asyncio.new_event_loop()
            _asyncio.set_event_loop(loop)
            
            # Try Playwright first
            try:
                print("[Wellfound] Trying Playwright scraper...")
                results = loop.run_until_complete(self._scrape_async(query, limit))
                if results:
                    return results
                print("[Wellfound] Playwright returned no results.")
            except Exception as e:
                print(f"[Wellfound] Playwright failed: {e}")
            finally:
                try:
                    loop.close()
                except Exception:
                    pass
                
            # Fall back to Firecrawl if available
            if settings.FIRECRAWL_API_KEY:
                print("[Wellfound] Falling back to Firecrawl...")
                try:
                    return self._scrape_firecrawl(query, limit)
                except Exception as e:
                    print(f"[Wellfound] Firecrawl failed: {e}")
            else:
                print("[Wellfound] Firecrawl API key missing. Cannot run fallback.")
            return []

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

    def _scrape_firecrawl(self, query: ParsedQuery, limit: int = 20):
        import html as _html
        from firecrawl import FirecrawlApp
        from app.config import settings
        
        job_title = query.role
        location = query.location
        url = self._build_url(job_title, location)
        
        print(f"[Wellfound Firecrawl] Scraping url: {url}")
        app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)
        resp = app.scrape_url(url, params={"formats": ["markdown"], "waitFor": 5000, "timeout": 60000})
        
        res_dict = {}
        if isinstance(resp, dict):
            res_dict = resp
        elif hasattr(resp, "model_dump"):
            res_dict = resp.model_dump()
        elif hasattr(resp, "dict"):
            res_dict = resp.dict()
        elif hasattr(resp, "__dict__"):
            res_dict = vars(resp)
            
        markdown = res_dict.get("markdown") or ""
        if not markdown:
            print("[Wellfound Firecrawl] Returned empty markdown.")
            return []
            
        jobs = self._parse_markdown(markdown)
        jobs = [j for j in jobs if title_matches_role(str(j.get("title") or ""), job_title)]
        jobs = jobs[:limit]
        
        listings = []
        for job in jobs:
            job_url = str(job.get("url") or "").strip()
            if job_url and not job_url.startswith("http"):
                job_url = f"{_BASE_URL}{job_url}" if job_url.startswith("/") else f"{_BASE_URL}/{job_url}"
            listings.append(RawJobListing(
                title=str(job.get("title") or "").strip(),
                company=str(job.get("company") or "").strip(),
                company_logo_url=(str(job.get("company_logo_url") or "").strip() or None),
                location=_clean_loc(str(job.get("location") or "").strip()) or "Remote",
                salary_range=str(job.get("salary") or "").strip() or None,
                description=str(job.get("description") or "").strip()[:5000],
                url=job_url or _BASE_URL,
                source=self.source_name,
                tags=[],
                posted_at=None,
            ))
            
        print(f"[Wellfound Firecrawl] Returned {len(listings)} jobs.")
        return listings

    def _parse_markdown(self, markdown):
        import html as _html
        if not markdown:
            return []
        lines = [ln.strip() for ln in markdown.splitlines()]
        jobs = []
        company = ""
        company_logo = ""
        i = 0
        while i < len(lines):
            line = lines[i]
            if "wellfound.com/company/" in line:
                logo_m = re.search(r"!\[[^\]]*\]\((?P<img>https?://[^)]+)\)", line)
                if logo_m:
                    company_logo = logo_m.group("img").strip()
                bold_m = re.search(r"\*\*(?P<c>.+?)\*\*", line)
                logoname_m = re.search(r"!\[(?P<c>[^\]]+?)\s+company logo\]", line)
                if bold_m:
                    company = _html.unescape(bold_m.group("c")).strip()
                    i += 1
                    continue
                if logoname_m:
                    company = _html.unescape(logoname_m.group("c")).strip()
                    i += 1
                    continue
                i += 1
                continue
            jm = re.match(r"^\[(?P<t>[^\]]+)\]\((?P<u>https://wellfound\.com/jobs/[^)]*)\)", line)
            if not jm:
                i += 1
                continue
            title = _html.unescape(jm.group("t")).strip()
            url = jm.group("u").strip()
            detail = []
            c = i + 1
            while c < len(lines):
                nl = lines[c]
                if "wellfound.com/company/" in nl:
                    break
                if re.match(r"^\[[^\]]+\]\(https://wellfound\.com/jobs/", nl):
                    break
                if nl:
                    detail.append(_html.unescape(nl))
                c += 1
            jobs.append({
                "title": title,
                "company": company,
                "company_logo_url": company_logo,
                "location": self._loc(detail),
                "salary": self._salary(detail),
                "description": self._desc(detail),
                "url": url,
            })
            i = c
        return jobs

    @staticmethod
    def _has_currency(text):
        t = text.lower()
        return ("$" in text or "\u20b9" in text or "\u20ac" in text or "\u00a3" in text
                or "rs " in t or "inr" in t)

    def _salary(self, lines):
        for ln in lines:
            if self._has_currency(ln):
                return ln.strip()
        return ""

    def _loc(self, lines):
        skip = re.compile(r"(full-time|contract|internship|founder|years?\s+of\s+exp|save|apply)", re.I)
        date = re.compile(r"^(?:today|yesterday|\d+\s*(?:day|days|week|weeks|month|months|year|years)\s+ago)", re.I)
        for ln in lines:
            s = ln.strip()
            if not s or self._has_currency(s) or skip.search(s) or date.search(s):
                continue
            return s
        return ""

    def _desc(self, lines):
        out = []
        for ln in lines:
            t = ln.replace("Save", "").replace("Apply", "").strip()
            if not t or self._has_currency(t):
                continue
            if re.search(r"^(?:today|yesterday|\d+\s*(?:day|week|month|year)s?\s+ago)", t, re.I):
                continue
            out.append(_clean_loc(t))
        return " / ".join(out[:4])
