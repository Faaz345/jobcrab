"""Tests for shared role-matching logic."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.scrapers.matching import title_matches_role, meaningful_query_tokens, normalize_role_text


def test_engineer_developer_synonym():
    assert title_matches_role("Backend Engineer", "Backend Developer")


def test_frontend_variants():
    assert title_matches_role("Front End Developer", "Frontend Developer")


def test_rejects_unrelated_title():
    assert not title_matches_role("Mail Carrier", "AI Engineer")


def test_meaningful_tokens_drop_stopwords():
    tokens = meaningful_query_tokens("senior backend developer jobs")
    assert "jobs" not in tokens
    assert "backend" in tokens


def test_normalize_role_text():
    assert normalize_role_text("Front-End  Developer") == "frontend developer"