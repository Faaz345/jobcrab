"""
Wellfound scraper (ported from the proven job-scrapper project).

Uses Firecrawl to render the Wellfound role page, then parses job cards from
the returned markdown. Adapted to the async FastAPI interface.
"""

import re
import html
import logging
import asyncio

from app.scrapers.base import BaseScraper, ParsedQuery, RawJobListing
from app.scrapers.matching import title_matches_role
from app.config import settings

logger = logging.getLogger(__name__)
_BASE_URL = "https://wellfound.com"


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")


def _clean_loc(value: str) -> str:
    # Replace any non-ASCII separator glyphs (bullets / mojibake) with " - "
    value = "".join((ch if ord(ch) < 128 else " - ") for ch in value)
    return re.sub(r"\s+", " ", value).strip(" -")


class WellfoundScraper(BaseScraper):
    source_name = "wellfound"

    async def scrape(self, query: ParsedQuery, limit: int = 20, pages: int = 1):
        return await asyncio.to_thread(self._scrape_sync, query, limit)

    def _scrape_sync(self, query: ParsedQuery, limit: int):
        if not settings.FIRECRAWL_API_KEY:
            print("[Wellfound] FIRECRAWL_API_KEY not set. Skipping.")
            return []
        try:
            client = self._client()
        except Exception as exc:
            print(f"[Wellfound] client error: {exc}")
            return []

        job_title = query.role
        location = query.location
        url = self._build_url(job_title, location)
        try:
            response = client.scrape_url(url, formats=["markdown", "links"],
                                         wait_for=5000, timeout=60000)
        except Exception as exc:
            print(f"[Wellfound] Firecrawl request failed: {exc}")
            return []

        data = self._to_dict(response)
        markdown = data.get("markdown") or ""
        jobs = self._parse_markdown(markdown)
        jobs = [j for j in jobs if title_matches_role(str(j.get("title") or ""), job_title)]
        jobs = jobs[:limit]
        # Enrich each job with its full "About the job" description from the
        # detail page (the role listing only carries a short snippet).
        for j in jobs:
            try:
                self._enrich_description(client, j)
            except Exception as exc:
                print(f"[Wellfound] JD fetch failed: {exc}")
        listings = [self._to_listing(j) for j in jobs if j.get("title") and j.get("company")]
        logger.info("Wellfound: %s jobs for %r", len(listings), job_title)
        return listings

    def _enrich_description(self, client, job):
        url = str(job.get("url") or "").strip()
        if not url:
            return
        resp = client.scrape_url(url, formats=["markdown"], wait_for=5000, timeout=60000)
        md = self._to_dict(resp).get("markdown") or ""
        if not md:
            return
        about = self._extract_about(md)
        if about and len(about) > len(str(job.get("description") or "")):
            job["description"] = about[:8000]

    @staticmethod
    def _extract_about(markdown: str) -> str:
        """Pull the 'About the job' section out of a Wellfound job page."""
        import re as _re
        lower = markdown.lower()
        start = lower.find("about the job")
        if start < 0:
            start = lower.find("about the role")
        if start < 0:
            return ""
        chunk = markdown[start:]
        # Stop at the next major section heading if present
        for marker in ("\n## ", "\nAbout the company", "\nApply", "\nMeet your"):
            idx = chunk.find(marker, 5)
            if idx > 0:
                chunk = chunk[:idx]
                break
        # Drop the leading heading line itself
        chunk = _re.sub(r"^about the (?:job|role)\s*", "", chunk, flags=_re.IGNORECASE).strip()
        chunk = _re.sub(r"\n{3,}", "\n\n", chunk)
        return chunk.strip()

    def _client(self):
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            try:
                from firecrawl import V1FirecrawlApp
                return V1FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)
            except ImportError:
                from firecrawl import FirecrawlApp
                return FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)

    @staticmethod
    def _build_url(job_title, location):
        slug = _slugify(job_title)
        # Wellfound: /role/r/<role> is the remote/role search; /role/l/<role>/<city>
        # is the location-scoped page.
        if location and location.lower() != "remote":
            return f"{_BASE_URL}/role/l/{slug}/{_slugify(location)}"
        return f"{_BASE_URL}/role/r/{slug}"

    def _parse_markdown(self, markdown):
        if not markdown:
            return []
        lines = [ln.strip() for ln in markdown.splitlines()]
        jobs = []
        company = ""
        company_logo = ""
        i = 0
        while i < len(lines):
            line = lines[i]
            # Wellfound emits two lines per company that both link to
            # /company/<slug>:
            #   1) a logo line:  [![<Company> company logo](<logo_url>)](.../company/...)
            #   2) a name line:  [**<Company>**](.../company/...)
            # We capture the logo from the logo line and the name from the bold
            # line, keying the logo to whichever company we are currently on.
            if "wellfound.com/company/" in line:
                logo_m = re.search(r"!\[[^\]]*\]\((?P<img>https?://[^)]+)\)", line)
                if logo_m:
                    company_logo = logo_m.group("img").strip()
                bold_m = re.search(r"\*\*(?P<c>.+?)\*\*", line)
                logoname_m = re.search(r"!\[(?P<c>[^\]]+?)\s+company logo\]", line)
                if bold_m:
                    company = html.unescape(bold_m.group("c")).strip()
                    i += 1
                    continue
                if logoname_m:
                    company = html.unescape(logoname_m.group("c")).strip()
                    i += 1
                    continue
                i += 1
                continue
            jm = re.match(r"^\[(?P<t>[^\]]+)\]\((?P<u>https://wellfound\.com/jobs/[^)]*)\)", line)
            if not jm:
                i += 1
                continue
            title = html.unescape(jm.group("t")).strip()
            url = jm.group("u").strip()
            detail = []
            c = i + 1
            while c < len(lines):
                nl = lines[c]
                # Stop at the next company block (either the bold-name line OR
                # the logo line) so the next company's logo is parsed by the
                # outer loop instead of being swallowed as a detail line.
                if "wellfound.com/company/" in nl:
                    break
                if re.match(r"^\[[^\]]+\]\(https://wellfound\.com/jobs/", nl):
                    break
                if nl:
                    detail.append(html.unescape(nl))
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

    def _to_listing(self, job):
        url = str(job.get("url") or "").strip()
        if url and not url.startswith("http"):
            url = f"{_BASE_URL}{url}" if url.startswith("/") else f"{_BASE_URL}/{url}"
        return RawJobListing(
            title=str(job.get("title") or "").strip(),
            company=str(job.get("company") or "").strip(),
            company_logo_url=(str(job.get("company_logo_url") or "").strip() or None),
            location=_clean_loc(str(job.get("location") or "").strip()) or "Remote",
            salary_range=str(job.get("salary") or "").strip() or None,
            description=str(job.get("description") or "").strip()[:5000],
            url=url or _BASE_URL,
            source=self.source_name,
            tags=[],
            posted_at=None,
        )

    @staticmethod
    def _to_dict(response):
        if isinstance(response, dict):
            return response
        for attr in ("model_dump", "dict"):
            if hasattr(response, attr):
                try:
                    return getattr(response, attr)()
                except Exception:
                    pass
        if hasattr(response, "__dict__"):
            return dict(vars(response))
        return {}
