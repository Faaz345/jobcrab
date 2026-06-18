"""
FastAPI routes for scraping operations.
POST /scrape/start — start a scraping job
GET /scrape/status/{session_id} — check status
"""

import asyncio
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.parsers.query_parser import parse_query
from app.scrapers.remoteok import RemoteOKScraper
from app.scrapers.naukri import NaukriScraper
from app.scrapers.wellfound import WellfoundScraper
from app.normalizers.job_normalizer import normalize_batch
from app.db.repository import (
    get_db,
    update_session_status,
    insert_job_listings,
    get_session_status,
)

router = APIRouter(prefix="/scrape", tags=["scraping"])

# Registry of available scrapers
SCRAPERS = {
    "remoteok": RemoteOKScraper,
    "naukri": NaukriScraper,
    "wellfound": WellfoundScraper,
}


class ScrapeRequest(BaseModel):
    session_id: str
    user_id: str
    query: str
    sources: list[str] = ["remoteok"]
    limit: int = 20
    pages: int = 3


class ScrapeResponse(BaseModel):
    session_id: str
    status: str
    message: str


@router.post("/start", status_code=202, response_model=ScrapeResponse)
async def start_scrape(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    Start a scraping job. Runs in the background and writes results to DB.
    Returns 202 immediately.
    """
    # Validate sources
    valid_sources = [s for s in request.sources if s in SCRAPERS]
    if not valid_sources:
        raise HTTPException(
            status_code=400,
            detail=f"No valid sources provided. Choose from: {list(SCRAPERS.keys())}",
        )

    # Update session status to running
    db = get_db()
    try:
        update_session_status(db, request.session_id, "running")
    finally:
        db.close()

    # Launch background scraping task
    background_tasks.add_task(
        _run_scraping,
        session_id=request.session_id,
        user_id=request.user_id,
        query=request.query,
        sources=valid_sources,
        limit=request.limit,
        pages=request.pages,
    )

    return ScrapeResponse(
        session_id=request.session_id,
        status="running",
        message=f"Scraping started from {', '.join(valid_sources)}",
    )


@router.get("/status/{session_id}")
async def scrape_status(session_id: str):
    """Get current status of a scraping session."""
    db = get_db()
    try:
        status = get_session_status(db, session_id)
    finally:
        db.close()

    if not status:
        raise HTTPException(status_code=404, detail="Session not found")

    return status


async def _run_scraping(
    session_id: str,
    user_id: str,
    query: str,
    sources: list[str],
    limit: int,
    pages: int,
):
    """
    Background task: parse query, run scrapers in parallel, normalize, and write to DB.
    """
    db = get_db()
    total_inserted = 0

    try:
        # Parse natural language query
        parsed_query = await parse_query(query)
        print(f"[Scraper] Parsed query: {parsed_query}")

        # Create scraper instances
        scraper_tasks = []
        for source_name in sources:
            scraper_class = SCRAPERS[source_name]
            scraper = scraper_class()
            per_source_limit = max(5, limit // len(sources))
            scraper_tasks.append(scraper.scrape(parsed_query, per_source_limit, pages))

        # Run all scrapers in parallel
        results = await asyncio.gather(*scraper_tasks, return_exceptions=True)

        # Process results from each scraper
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"[Scraper] {sources[i]} failed: {result}")
                continue

            if not result:
                print(f"[Scraper] {sources[i]} returned no results")
                continue

            # Normalize and insert
            normalized = normalize_batch(result, session_id, user_id)
            if normalized:
                count = insert_job_listings(db, normalized)
                total_inserted += count
                print(f"[Scraper] {sources[i]}: inserted {count} jobs")

        # Update session as completed
        update_session_status(db, session_id, "completed", total_inserted)
        print(f"[Scraper] Session {session_id} completed. Total: {total_inserted} jobs")

    except Exception as e:
        print(f"[Scraper] Fatal error: {e}")
        update_session_status(db, session_id, "failed")
    finally:
        db.close()


class HRScrapeRequest(BaseModel):
    company_name: str
    domain: Optional[str] = None


@router.post("/hr-contacts")
async def get_hr_contacts(request: HRScrapeRequest):
    """
    Synchronous endpoint to fetch HR contacts for a company.
    """
    from app.scrapers.hr_scraper import scrape_hr_contacts
    
    contacts = scrape_hr_contacts(request.company_name, request.domain)
    
    return {
        "company": request.company_name,
        "contacts": contacts
    }
