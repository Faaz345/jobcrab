"""
Database repository for the scraping service.
Uses SQLAlchemy to write scrape sessions and job listings to PostgreSQL.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    create_engine, Column, String, Text, Boolean, Integer, Float,
    DateTime, JSON, Enum as SAEnum, ARRAY,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.config import settings

# ── Engine & Session ──
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# ── Models (matching Prisma schema) ──

class ScrapeSessionModel(Base):
    __tablename__ = "scrape_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    query = Column(String, nullable=False)
    sources = Column(ARRAY(String), default=[])
    status = Column(String, default="pending")  # pending | running | completed | failed
    total_results = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)


class JobListingModel(Base):
    __tablename__ = "job_listings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scrape_session_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    salary_range = Column(String, nullable=True)
    description = Column(Text, default="")
    url = Column(String, nullable=False)
    source = Column(String, nullable=False)
    company_logo_url = Column(String, nullable=True)
    tags = Column(ARRAY(String), default=[])
    is_bookmarked = Column(Boolean, default=False)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    scraped_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Repository Functions ──

def get_db() -> Session:
    """Get a database session."""
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise


def update_session_status(
    db: Session,
    session_id: str,
    status: str,
    total_results: Optional[int] = None,
):
    """Update scrape session status and optionally total_results."""
    session = db.query(ScrapeSessionModel).filter_by(id=session_id).first()
    if session:
        session.status = status
        if total_results is not None:
            session.total_results = total_results
        if status in ("completed", "failed"):
            session.completed_at = datetime.now(timezone.utc)
        db.commit()


def insert_job_listings(db: Session, listings: list[dict]) -> int:
    """Insert normalized job listings into the database. Returns count inserted."""
    count = 0
    for listing in listings:
        job = JobListingModel(
            id=str(uuid.uuid4()),
            scrape_session_id=listing["scrape_session_id"],
            user_id=listing["user_id"],
            title=listing["title"],
            company=listing["company"],
            location=listing.get("location"),
            salary_range=listing.get("salary_range"),
            description=listing.get("description", ""),
            url=listing["url"],
            source=listing["source"],
            company_logo_url=listing.get("company_logo_url"),
            tags=listing.get("tags", []),
            is_bookmarked=listing.get("is_bookmarked", False),
            posted_at=listing.get("posted_at"),
            scraped_at=listing.get("scraped_at", datetime.now(timezone.utc)),
        )
        db.add(job)
        count += 1

    db.commit()
    return count


def get_session_status(db: Session, session_id: str) -> Optional[dict]:
    """Get current status of a scrape session."""
    session = db.query(ScrapeSessionModel).filter_by(id=session_id).first()
    if not session:
        return None

    job_count = db.query(JobListingModel).filter_by(
        scrape_session_id=session_id
    ).count()

    return {
        "session_id": session.id,
        "status": session.status,
        "query": session.query,
        "sources": session.sources,
        "total_results": job_count,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
    }
