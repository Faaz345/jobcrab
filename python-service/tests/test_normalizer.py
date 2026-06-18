"""Tests for the job normalizer."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.scrapers.base import RawJobListing
from app.normalizers.job_normalizer import normalize_job, normalize_batch


def _raw(url="https://x.com/1", title="Backend Developer"):
    return RawJobListing(
        title=title, company="Acme", location="Remote",
        salary_range="$100k", description="desc", url=url,
        source="remoteok", company_logo_url="https://logo", tags=["python"],
    )


def test_normalize_job_maps_fields():
    d = normalize_job(_raw(), "sess-1", "user-1")
    assert d["title"] == "Backend Developer"
    assert d["scrape_session_id"] == "sess-1"
    assert d["user_id"] == "user-1"
    assert d["company_logo_url"] == "https://logo"
    assert d["is_bookmarked"] is False


def test_normalize_batch_dedupes_by_url():
    batch = [_raw(url="https://x.com/dup"), _raw(url="https://x.com/dup"), _raw(url="https://x.com/2")]
    out = normalize_batch(batch, "s", "u")
    assert len(out) == 2