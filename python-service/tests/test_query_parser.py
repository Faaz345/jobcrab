"""Tests for the deterministic query parser."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.parsers.query_parser import _deterministic_parse


def test_role_and_location():
    q = _deterministic_parse("Backend Developer in Mumbai")
    assert q.role == "Backend Developer"
    assert q.location == "Mumbai"


def test_strips_filler_words():
    q = _deterministic_parse("AI Engineer jobs in Bangalore")
    assert "job" not in q.role.lower()
    assert q.location == "Bangalore"


def test_remote_detection():
    q = _deterministic_parse("remote Python developer")
    assert q.remote is True
    assert q.location == "Remote"


def test_acronym_expansion():
    q = _deterministic_parse("PM")
    assert q.role == "Product Manager"


def test_empty_query():
    q = _deterministic_parse("")
    assert q.role == ""