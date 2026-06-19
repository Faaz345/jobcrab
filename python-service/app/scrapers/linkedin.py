import re
import urllib.parse
import logging
import httpx
from app.scrapers.base import BaseScraper, ParsedQuery, RawJobListing
from app.scrapers.matching import title_matches_role

logger = logging.getLogger(__name__)

class LinkedInScraper(BaseScraper):
    source_name = "linkedin"

    async def scrape(self, query: ParsedQuery, limit: int = 20, pages: int = 1):
        job_title = query.role
        location = query.location or "Worldwide"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        
        q = urllib.parse.quote(job_title)
        l = urllib.parse.quote(location)
        
        all_listings: list[RawJobListing] = []
        
        for page_num in range(pages):
            start = page_num * 10
            url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={q}&location={l}&start={start}"
            
            print(f"[LinkedIn] scraping url: {url}")
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(url, headers=headers, timeout=20)
                    if resp.status_code == 429:
                        print("[LinkedIn] 429 Too Many Requests. IP might be rate-limited.")
                        break
                    if resp.status_code != 200:
                        print(f"[LinkedIn] non-200 response: {resp.status_code}")
                        break
                    
                    html = resp.text
                    card_matches = list(re.finditer(r'<a class="base-card__full-link[^"]*" href="(?P<url>https://[^"]+/jobs/view/[^"]+)"', html))
                    
                    if not card_matches:
                        print("[LinkedIn] no more job cards found.")
                        break
                        
                    for index, match in enumerate(card_matches):
                        if len(all_listings) >= limit:
                            break
                            
                        start_pos = match.start()
                        end_pos = card_matches[index+1].start() if index + 1 < len(card_matches) else len(html)
                        card_html = html[start_pos:end_pos]
                        
                        # Extract URL
                        job_url = match.group("url")
                        if "?" in job_url:
                            job_url = job_url.split("?")[0]
                            
                        # Extract Title
                        title_m = re.search(r'<span class="sr-only">\s*(.*?)\s*</span>', card_html, re.S)
                        title = title_m.group(1).strip() if title_m else "Unknown Title"
                        
                        # Extract Company Name
                        company_m = re.search(r'<a class="hidden-nested-link"[^>]*>\s*(.*?)\s*</a>', card_html, re.S)
                        if not company_m:
                            company_m = re.search(r'<h4 class="base-search-card__subtitle"[^>]*>\s*(.*?)\s*</h4>', card_html, re.S)
                        company = company_m.group(1).strip() if company_m else "Unknown Company"
                        company = re.sub(r'<[^>]+>', '', company).strip()
                        
                        # Extract Location
                        loc_m = re.search(r'<span class="job-search-card__location"[^>]*>\s*(.*?)\s*</span>', card_html, re.S)
                        job_location = loc_m.group(1).strip() if loc_m else location
                        
                        # Extract Logo
                        logo_m = re.search(r'data-delayed-url="(?P<logo>https://[^"]+)"', card_html)
                        if not logo_m:
                            logo_m = re.search(r'src="(?P<logo>https://[^"]+)"', card_html)
                        logo = logo_m.group("logo") if logo_m else None
                        if logo:
                            logo = logo.replace("&amp;", "&")
                        
                        if title_matches_role(title, job_title):
                            all_listings.append(RawJobListing(
                                title=title,
                                company=company,
                                location=job_location,
                                salary_range=None,
                                description=f"{title} at {company} in {job_location}",
                                url=job_url,
                                source=self.source_name,
                                company_logo_url=logo,
                                tags=[],
                                posted_at=None,
                            ))
                            
            except Exception as e:
                print(f"[LinkedIn] Error scraping page {page_num}: {e}")
                break
                
            if len(all_listings) >= limit:
                break
                
        logger.info("LinkedIn: %s jobs for %r", len(all_listings), job_title)
        print(f"[LinkedIn] returned {len(all_listings)} jobs")
        return all_listings

