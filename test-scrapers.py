import asyncio
import sys
import os

# Add python-service to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "python-service"))

from app.scrapers.base import ParsedQuery
from app.scrapers.remoteok import RemoteOKScraper
from app.scrapers.naukri import NaukriScraper
from app.scrapers.wellfound import WellfoundScraper
from app.scrapers.linkedin import LinkedInScraper

async def main():
    query = ParsedQuery(
        role="AI Engineer",
        location="Mumbai",
        remote=False
    )
    
    print("Testing RemoteOK Scraper...")
    try:
        remoteok = RemoteOKScraper()
        jobs = await remoteok.scrape(query, limit=5)
        print(f"RemoteOK returned {len(jobs)} jobs.")
    except Exception as e:
        print("RemoteOK failed:", e)

    print("\nTesting LinkedIn Scraper...")
    try:
        linkedin = LinkedInScraper()
        jobs = await linkedin.scrape(query, limit=5)
        print(f"LinkedIn returned {len(jobs)} jobs.")
    except Exception as e:
        print("LinkedIn failed:", e)

    print("\nTesting Naukri Scraper...")
    try:
        naukri = NaukriScraper()
        jobs = await naukri.scrape(query, limit=5)
        print(f"Naukri returned {len(jobs)} jobs.")
    except Exception as e:
        print("Naukri failed:", e)

    print("\nTesting Wellfound Scraper...")
    try:
        wellfound = WellfoundScraper()
        jobs = await wellfound.scrape(query, limit=5)
        print(f"Wellfound returned {len(jobs)} jobs.")
    except Exception as e:
        print("Wellfound failed:", e)

if __name__ == "__main__":
    asyncio.run(main())
