"""
LinkedIn scraper (async Playwright).
Fetches jobs from LinkedIn public search endpoint.
"""

import re
import urllib.parse
import logging
from app.scrapers.base import BaseScraper, ParsedQuery, RawJobListing
from app.scrapers.matching import title_matches_role

logger = logging.getLogger(__name__)

class LinkedInScraper(BaseScraper):
    source_name = "linkedin"

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
            print("[LinkedIn] Playwright not installed. Skipping.")
            return []

        job_title = query.role
        location = query.location or "Worldwide"
        
        # Build URL
        q = urllib.parse.quote(job_title)
        l = urllib.parse.quote(location)
        url = f"https://www.linkedin.com/jobs/search?keywords={q}&location={l}"
        
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
                    # Block images and unnecessary resources to speed up and reduce ban risk
                    await page.route("**/*", lambda route: route.continue_() if route.request.resource_type in ["document", "script", "xhr", "fetch"] else route.abort())
                    
                    print(f"[LinkedIn] scraping url: {url}")
                    resp = await page.goto(url, timeout=45000, wait_until="domcontentloaded")
                    
                    if resp and resp.status == 429:
                        print("[LinkedIn] 429 Too Many Requests. IP might be rate-limited.")
                        return []
                        
                    await page.wait_for_timeout(3000)
                    
                    # Scroll down to load more jobs if needed
                    for _ in range(3):
                        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                        await page.wait_for_timeout(1000)
                    
                    raw_jobs = await page.evaluate(
                        '''
                        () => {
                            const jobs = [];
                            // LinkedIn public job search uses these classes
                            const cards = document.querySelectorAll('div.base-search-card, li > div.job-search-card');
                            
                            for (const card of cards) {
                                const titleEl = card.querySelector('.base-search-card__title');
                                const companyEl = card.querySelector('.base-search-card__subtitle');
                                const locationEl = card.querySelector('.job-search-card__location');
                                const linkEl = card.querySelector('.base-card__full-link') || card.querySelector('a');
                                
                                if (!titleEl || !linkEl) continue;
                                
                                const title = titleEl.textContent.trim();
                                const company = companyEl ? companyEl.textContent.trim() : "Unknown Company";
                                const location = locationEl ? locationEl.textContent.trim() : "Remote";
                                let url = linkEl.href;
                                
                                // Clean tracking params from URL
                                if (url.includes('?')) {
                                    url = url.split('?')[0];
                                }
                                
                                jobs.push({
                                    title,
                                    company,
                                    location,
                                    url,
                                    salary: "",
                                    description: title + " at " + company + " in " + location
                                });
                            }
                            return jobs;
                        }
                        '''
                    )
                    
                    for j in raw_jobs:
                        if title_matches_role(j.get("title", ""), job_title):
                            all_listings.append(RawJobListing(
                                title=j.get("title", ""),
                                company=j.get("company", ""),
                                location=j.get("location") or location,
                                salary_range=j.get("salary") or None,
                                description=(j.get("description") or "")[:5000],
                                url=j.get("url", ""),
                                source=self.source_name,
                                company_logo_url=None,
                                tags=[],
                                posted_at=None,
                            ))
                            
                    all_listings = all_listings[:limit]
                    
                finally:
                    await browser.close()
        except Exception as exc:
            print(f"[LinkedIn] error: {exc}")

        logger.info("LinkedIn: %s jobs for %r", len(all_listings), job_title)
        print(f"[LinkedIn] returned {len(all_listings)} jobs")
        return all_listings

    async def _launch(self, pw, PlaywrightError):
        args = ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        try:
            return await pw.chromium.launch(channel="chrome", headless=True, args=args)
        except PlaywrightError as exc:
            print(f"[LinkedIn] Chrome channel unavailable ({exc}); trying bundled Chromium.")
            try:
                return await pw.chromium.launch(headless=True, args=args)
            except PlaywrightError as exc2:
                raise RuntimeError(
                    "LinkedIn needs Google Chrome or a Playwright browser. "
                    f"({exc2})"
                ) from exc2
