"""
Abstract base class for all job scrapers.
Each scraper (RemoteOK, Naukri, Wellfound) extends this class.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ParsedQuery:
    """Structured query parsed from natural language input."""
    role: str
    location: Optional[str] = None
    experience_level: Optional[str] = None  # "entry" | "mid" | "senior"
    remote: Optional[bool] = None
    keywords: list[str] = field(default_factory=list)
    raw_query: str = ""


@dataclass
class RawJobListing:
    """Raw job listing scraped from a source, before normalization."""
    title: str
    company: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    description: str = ""
    url: str = ""
    source: str = ""  # "remoteok" | "naukri" | "wellfound"
    company_logo_url: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    posted_at: Optional[datetime] = None


class BaseScraper(ABC):
    """Abstract base for all job scrapers."""

    source_name: str = ""

    @abstractmethod
    async def scrape(
        self,
        query: ParsedQuery,
        limit: int = 20,
        pages: int = 3,
    ) -> list[RawJobListing]:
        """
        Scrape job listings matching the given query.

        Args:
            query: Structured search parameters
            limit: Maximum number of results to return
            pages: Maximum pages to scrape (for paginated sources)

        Returns:
            List of raw job listings
        """
        ...

    def _build_search_url(self, query: ParsedQuery) -> str:
        """Build a source-specific search URL. Override in subclasses."""
        raise NotImplementedError
