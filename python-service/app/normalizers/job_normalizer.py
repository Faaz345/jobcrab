"""
Normalizes raw job listings from various scrapers into a unified schema
matching the Prisma JobListing model.
"""

from datetime import datetime, timezone
from typing import Optional
from app.scrapers.base import RawJobListing


def normalize_job(
    raw: RawJobListing,
    session_id: str,
    user_id: str,
) -> dict:
    """
    Normalize a RawJobListing into a dict matching the PostgreSQL job_listings table.
    """
    return {
        "scrape_session_id": session_id,
        "user_id": user_id,
        "title": _clean_text(raw.title),
        "company": _clean_text(raw.company),
        "location": _clean_text(raw.location) if raw.location else None,
        "salary_range": raw.salary_range,
        "description": raw.description or "No description available",
        "url": raw.url,
        "source": raw.source,
        "company_logo_url": raw.company_logo_url,
        "tags": raw.tags or [],
        "is_bookmarked": False,
        "posted_at": raw.posted_at,
        "scraped_at": datetime.now(timezone.utc),
    }


def normalize_batch(
    raw_listings: list[RawJobListing],
    session_id: str,
    user_id: str,
) -> list[dict]:
    """Normalize a batch of raw listings."""
    seen_urls: set[str] = set()
    normalized: list[dict] = []

    for raw in raw_listings:
        # Deduplicate by URL
        if raw.url in seen_urls:
            continue
        seen_urls.add(raw.url)
        normalized.append(normalize_job(raw, session_id, user_id))

    return normalized


def _clean_text(text: Optional[str]) -> str:
    """Strip whitespace and normalize."""
    if not text:
        return ""
    return " ".join(text.split()).strip()
