"""
RemoteOK scraper (ported from the proven job-scrapper project).
Fetches jobs from RemoteOK public JSON API using category feeds + shared
role-matching, adapted to the async FastAPI interface.
"""

import re
import time
import logging
import asyncio
from datetime import datetime
from difflib import get_close_matches

import httpx

from app.scrapers.base import BaseScraper, ParsedQuery, RawJobListing
from app.scrapers.matching import (
    meaningful_query_tokens,
    normalize_role_text,
    title_matches_role,
)

logger = logging.getLogger(__name__)

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
_REQUEST_TIMEOUT = 30
_RETRY_ATTEMPTS = 3
_RETRY_BACKOFF = 2.0
_API_URL = "https://remoteok.com/api"
_BASE_URL = "https://remoteok.com"

_CATEGORY_FEEDS = {
    "customer support": ("customer-support", "support"),
    "support": ("support", "customer-support"),
    "marketing": ("marketing",),
    "operations": ("operations", "ops"),
    "ops": ("ops", "operations"),
    "education": ("education", "teaching", "training"),
    "engineer": ("engineer", "engineering", "software"),
    "engineering": ("engineering", "engineer", "software"),
    "finance": ("finance", "financial", "accounting"),
    "medical": ("medical", "healthcare", "biotech"),
    "healthcare": ("healthcare", "medical"),
    "sales": ("sales",),
    "developer": ("engineer", "software"),
    "dev": ("dev", "engineer", "software"),
    "design": ("design", "designer"),
    "designer": ("designer", "design"),
    "admin": ("admin", "sys-admin"),
    "recruiter": ("recruiter",),
    "hr": ("hr", "recruiter"),
    "content": ("content", "content-writing"),
    "writer": ("writer", "content-writing"),
    "manager": ("manager",),
    "virtual assistant": ("virtual-assistant", "assistant"),
    "analyst": ("analyst", "analytics"),
    "analytics": ("analytics", "analyst"),
    "testing": ("testing", "quality-assurance"),
    "qa": ("quality-assurance", "testing"),
    "ai": ("ai", "machine-learning"),
    "machine learning": ("machine-learning", "ai"),
    "ml": ("machine-learning", "ai"),
    "cloud": ("cloud", "aws"),
    "golang": ("golang",),
    "security": ("security", "infosec"),
    "infosec": ("infosec", "security"),
    "backend": ("backend",),
    "saas": ("saas",),
    "mobile": ("mobile",),
    "junior": ("junior",),
    "data science": ("data-science", "data", "analytics", "machine-learning"),
    "data scientist": ("data-science", "machine-learning", "data"),
    "data": ("data", "data-science", "analytics"),
    "python": ("python",),
    "software": ("software", "engineer"),
    "devops": ("devops", "sys-admin"),
    "seo": ("seo", "marketing"),
    "frontend": ("front-end",),
    "front end": ("front-end",),
    "react": ("react", "front-end", "javascript"),
    "fullstack": ("full-stack", "software"),
    "full stack": ("full-stack", "software"),
    "product": ("product", "product-manager"),
    "product manager": ("product-manager", "product"),
    "javascript": ("javascript",),
    "aws": ("aws", "cloud"),
    "typescript": ("typescript", "javascript"),
}

_LOCATION_ALIASES = {
    "remote": ("remote", "worldwide", "anywhere", "global"),
    "india": ("india", "mumbai", "bengaluru", "bangalore", "delhi", "ncr", "noida",
              "gurugram", "gurgaon", "hyderabad", "pune", "chennai", "kolkata", "ahmedabad"),
    "united states": ("united states", "usa", "us", "america"),
    "usa": ("united states", "usa", "us", "america"),
    "uk": ("united kingdom", "uk", "england", "scotland", "wales"),
    "united kingdom": ("united kingdom", "uk", "england", "scotland", "wales"),
}


class RemoteOKScraper(BaseScraper):
    source_name = "remoteok"

    async def scrape(self, query: ParsedQuery, limit: int = 20, pages: int = 1):
        return await asyncio.to_thread(self._scrape_sync, query, limit)

    def _scrape_sync(self, query: ParsedQuery, limit: int):
        job_title = query.role
        location = query.location
        try:
            feed_urls, category_slugs = self._feed_urls_for_query(job_title)
            if feed_urls:
                raw_jobs = self._dedupe(self._fetch_many(feed_urls))
                if not raw_jobs:
                    raw_jobs = self._fetch_api(_API_URL)
                filtered = self._filter_jobs(raw_jobs, job_title)
                if not filtered:
                    general = self._fetch_api(_API_URL)
                    filtered = self._filter_jobs(general, job_title)
                    raw_jobs = self._dedupe([*raw_jobs, *general])
            else:
                raw_jobs = self._dedupe(self._fetch_api(_API_URL))
                filtered = self._filter_jobs(raw_jobs, job_title)

            filtered = self._filter_by_location(filtered, location)

            if len(filtered) < limit and category_slugs:
                backfill = self._filter_by_location(raw_jobs, location)
                seen = {self._raw_key(j) for j in filtered}
                for job in backfill:
                    if len(filtered) >= limit:
                        break
                    k = self._raw_key(job)
                    if k in seen:
                        continue
                    seen.add(k)
                    filtered.append(job)

            filtered = filtered[:limit]
            listings = [self._to_listing(j) for j in filtered]
            logger.info("RemoteOK: %s jobs for %r", len(listings), job_title)
            print(f"[RemoteOK] returned {len(listings)} jobs")
            return listings
        except Exception as exc:
            print(f"[RemoteOK] error: {exc}")
            return []

    def _fetch_api(self, url=_API_URL):
        last_error = None
        for attempt in range(1, _RETRY_ATTEMPTS + 1):
            try:
                resp = httpx.get(url, headers={"User-Agent": _USER_AGENT, "Accept": "application/json"},
                                 timeout=_REQUEST_TIMEOUT, follow_redirects=True)
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, list):
                    return [i for i in data if isinstance(i, dict) and "position" in i]
                return []
            except httpx.HTTPStatusError as exc:
                last_error = exc
                if exc.response.status_code == 429 or exc.response.status_code >= 500:
                    time.sleep(_RETRY_BACKOFF ** attempt)
                    continue
                return []
            except (httpx.RequestError, ValueError) as exc:
                last_error = exc
                time.sleep(_RETRY_BACKOFF ** attempt)
        print(f"[RemoteOK] fetch failed: {last_error}")
        return []

    def _fetch_many(self, urls):
        merged, seen = [], set()
        for url in urls:
            for job in self._fetch_api(url):
                key = str(job.get("id") or job.get("slug") or job.get("url") or "")
                if not key:
                    key = f"{job.get('position', '')}|{job.get('company', '')}"
                if key in seen:
                    continue
                seen.add(key)
                merged.append(job)
        return merged

    def _feed_urls_for_query(self, job_title):
        slugs = self._category_slugs(job_title)
        feeds = [f"remote-{s}-jobs.json" for s in slugs]
        if not feeds:
            slug = "-".join(normalize_role_text(job_title).split())
            if slug:
                feeds.append(f"remote-{slug}-jobs.json")
        urls, seen = [], set()
        for path in feeds:
            u = f"{_BASE_URL}/{path}"
            if u not in seen:
                seen.add(u)
                urls.append(u)
        return urls, set(slugs)

    def _category_slugs(self, job_title):
        qn = normalize_role_text(job_title)
        if not qn:
            return []
        matched = set()
        keys = list(_CATEGORY_FEEDS)
        for alias in keys:
            if (" " in alias and f" {alias} " in f" {qn} ") or (" " not in alias and alias in set(qn.split())):
                matched.add(alias)
        for token in meaningful_query_tokens(qn):
            if token in _CATEGORY_FEEDS:
                matched.add(token)
                continue
            close = get_close_matches(token, keys, n=1, cutoff=0.86)
            if close:
                matched.add(close[0])
        slugs, seen = [], set()
        for alias in sorted(matched, key=len, reverse=True):
            for slug in _CATEGORY_FEEDS[alias]:
                if slug not in seen:
                    seen.add(slug)
                    slugs.append(slug)
        return slugs

    def _filter_jobs(self, jobs, job_title):
        return [j for j in jobs if title_matches_role(str(j.get("position") or ""), job_title)]

    def _filter_by_location(self, jobs, location):
        if not location:
            return jobs
        loc_norm = normalize_role_text(location)
        terms = {loc_norm} if loc_norm else set()
        for alias, alias_terms in _LOCATION_ALIASES.items():
            norm_terms = {normalize_role_text(t) for t in alias_terms}
            if loc_norm == alias or loc_norm in norm_terms:
                terms.update(norm_terms)
                terms.add(normalize_role_text(alias))
        remote_terms = ("remote", "worldwide", "anywhere", "global")

        def matches(raw):
            raw = (raw or "").strip()
            if not raw:
                return True
            n = normalize_role_text(raw)
            if not n:
                return False
            return any(t in n for t in terms) or any(t in n for t in remote_terms)

        return [j for j in jobs if matches(j.get("location"))]

    @staticmethod
    def _dedupe(jobs):
        out, seen = [], set()
        for j in jobs:
            k = RemoteOKScraper._raw_key(j)
            if k in seen:
                continue
            seen.add(k)
            out.append(j)
        return out

    @staticmethod
    def _raw_key(job):
        k = str(job.get("id") or job.get("url") or job.get("slug") or "").strip()
        if k:
            return k
        return f"{str(job.get('position') or '').lower()}|{str(job.get('company') or '').lower()}"

    def _to_listing(self, job):
        return RawJobListing(
            title=self._clean(job.get("position", "")),
            company=self._clean(job.get("company", "")),
            location=self._clean(job.get("location", "Remote")) or "Remote",
            salary_range=self._salary(job) or None,
            description=self._description(job),
            url=self._url(job),
            source=self.source_name,
            company_logo_url=self._logo(job),
            tags=[self._clean(t) for t in (job.get("tags") or []) if self._clean(t)][:8],
            posted_at=self._date(job),
        )

    @staticmethod
    def _clean(value):
        return str(value or "").strip()

    @staticmethod
    def _description(job):
        raw = str(job.get("description") or job.get("text") or "")
        text = re.sub(r"<[^>]+>", " ", raw)
        text = re.sub(r"\s+", " ", text).strip()
        # Strip RemoteOK's leading "Posted HH:MM:SS AM/PM" timestamp noise
        text = re.sub(r"^Posted\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?\.?\s*", "", text, flags=re.IGNORECASE)
        return text[:5000]

    @staticmethod
    def _salary(job):
        lo, hi = job.get("salary_min"), job.get("salary_max")
        if lo and hi:
            return f"${int(lo):,} - ${int(hi):,}"
        if lo:
            return f"${int(lo):,}+"
        return ""

    @staticmethod
    def _url(job):
        for key in ("url", "apply_url"):
            v = str(job.get(key) or "").strip()
            if v.startswith("http"):
                return v
            if v.startswith("/"):
                return f"{_BASE_URL}{v}"
        slug = str(job.get("slug") or "").strip().lstrip("/")
        if slug:
            if slug.startswith("remote-jobs/"):
                return f"{_BASE_URL}/{slug}"
            return f"{_BASE_URL}/remote-jobs/{slug}"
        return _BASE_URL

    @staticmethod
    def _logo(job):
        # RemoteOK's API exposes no usable company logo. Use a clean,
        # initials-based avatar generated from the company name so each job
        # still has a distinct, recognizable visual.
        logo = str(job.get("company_logo") or job.get("logo") or job.get("logo_url") or "").strip()
        if logo.startswith("http"):
            return logo
        company = str(job.get("company") or "").strip()
        if not company:
            return None
        import urllib.parse
        name = urllib.parse.quote(company[:40])
        return (
            f"https://ui-avatars.com/api/?name={name}"
            f"&size=128&background=0D8ABC&color=fff&bold=true&format=png"
        )

    @staticmethod
    def _date(job):
        d = job.get("date")
        if not d:
            return None
        try:
            return datetime.fromisoformat(str(d).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None
