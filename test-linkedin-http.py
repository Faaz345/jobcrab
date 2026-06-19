import httpx
import re
import urllib.parse

async def test_linkedin():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }
    
    q = urllib.parse.quote("AI Engineer")
    l = urllib.parse.quote("Mumbai")
    url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={q}&location={l}&start=0"
    
    print(f"Fetching: {url}")
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, timeout=15)
        html = resp.text
        
        # Split HTML by cards. Each card contains the class 'job-search-card'
        # We can split by '<li' or '<div' that starts a card
        # Or we can find all matches of the full-link anchor tag and extract the block around it
        card_matches = list(re.finditer(r'<a class="base-card__full-link[^"]*" href="(?P<url>https://[^"]+/jobs/view/[^"]+)"', html))
        
        jobs = []
        for index, match in enumerate(card_matches):
            start_pos = match.start()
            # The card block extends to the next match or to the end of the HTML
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
            company = re.sub(r'<[^>]+>', '', company).strip() # strip any nested tags
            
            # Extract Location
            loc_m = re.search(r'<span class="job-search-card__location"[^>]*>\s*(.*?)\s*</span>', card_html, re.S)
            location = loc_m.group(1).strip() if loc_m else "Remote"
            
            # Extract Logo
            logo_m = re.search(r'data-delayed-url="(?P<logo>https://[^"]+)"', card_html)
            if not logo_m:
                logo_m = re.search(r'src="(?P<logo>https://[^"]+)"', card_html)
            logo = logo_m.group("logo") if logo_m else None
            
            jobs.append({
                "title": title,
                "url": job_url,
                "company": company,
                "location": location,
                "logo": logo
            })
            
        print(f"Parsed {len(jobs)} jobs:")
        for idx, job in enumerate(jobs):
            print(f"{idx+1}. {job['title']} at {job['company']} ({job['location']})")
            print(f"   URL: {job['url']}")
            print(f"   Logo: {job['logo']}")



if __name__ == "__main__":
    import asyncio
    asyncio.run(test_linkedin())
