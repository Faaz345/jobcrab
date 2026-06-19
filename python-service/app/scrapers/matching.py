"""Shared role-title matching helpers for platform scrapers."""

from __future__ import annotations

import re
from collections.abc import Iterable


_WORD_RE = re.compile(r"[a-z0-9+#.]+")

_NORMALIZE_REPLACEMENTS = (
    (r"\bfrontned\b", "frontend"),
    (r"\bforntend\b", "frontend"),
    (r"\bfront\s*end\b", "frontend"),
    (r"\bfront[\s-]+end\b", "frontend"),
    (r"\bbackned\b", "backend"),
    (r"\bbakcend\b", "backend"),
    (r"\bback\s*end\b", "backend"),
    (r"\bback[\s-]+end\b", "backend"),
    (r"\bfull\s*stack\b", "fullstack"),
    (r"\bfull[\s-]+stack\b", "fullstack"),
    (r"\breact\s*js\b", "react"),
    (r"\bvue\s*js\b", "vue"),
    (r"\bangular\s*js\b", "angular"),
    (r"\bjavscript\b", "javascript"),
    (r"\bjava\s*script\b", "javascript"),
    (r"\bpyhton\b", "python"),
    (r"\bprodcut\b", "product"),
    (r"\bmanger\b", "manager"),
    (r"\bnode\.js\b", "nodejs"),
)

_STOP_WORDS = {
    "a",
    "an",
    "and",
    "contract",
    "freelance",
    "fulltime",
    "full",
    "hybrid",
    "in",
    "intern",
    "internship",
    "job",
    "jobs",
    "junior",
    "lead",
    "mid",
    "opening",
    "openings",
    "parttime",
    "remote",
    "role",
    "roles",
    "senior",
    "sr",
    "staff",
    "the",
}

_SYNONYM_GROUPS: tuple[frozenset[str], ...] = (
    frozenset({"engineer", "engineers", "engineering", "developer", "developers", "development", "dev", "devs", "programmer", "programmers", "sde"}),
    frozenset({"frontend", "react", "angular", "vue", "javascript", "typescript", "ui", "web"}),
    frozenset({"backend", "server-side"}),
    frozenset({"fullstack"}),
    frozenset({"manager", "managers", "management", "owner", "owners"}),
    frozenset({"product", "products"}),
    frozenset({"data", "analytics", "analyst", "analysts"}),
    frozenset({"scientist", "scientists", "science"}),
    frozenset({"designer", "designers", "design"}),
    frozenset({"executive", "executives", "exec"}),
    frozenset({"operations", "operation", "ops"}),
)

_TOKEN_TO_GROUP = {
    token: group
    for group in _SYNONYM_GROUPS
    for token in group
}


def title_matches_role(
    candidate_title: str,
    query_title: str,
    supplemental_text: str | Iterable[str] = "",
) -> bool:
    """Return True when a platform job title satisfies the searched role.

    The matcher is stricter than "any query word appears", but it understands
    common equivalents such as engineer/developer and frontend/front end.
    """
    query_norm = _normalize(query_title)
    candidate_norm = _normalize(_join_text(candidate_title, supplemental_text))

    if not query_norm or not candidate_norm:
        return False

    title_norm = _normalize(candidate_title)
    if (" " in query_norm or len(query_norm) >= 6) and query_norm in title_norm:
        return True

    requirements = _requirements_for_query(query_title)
    if not requirements:
        return True

    candidate_tokens = set(_tokens(candidate_norm))
    return all(_requirement_matches(req, candidate_tokens, candidate_norm) for req in requirements)


def meaningful_query_tokens(text: str) -> list[str]:
    """Return normalized query tokens that carry role meaning."""
    return [
        token
        for token in _tokens(_normalize(text))
        if token not in _STOP_WORDS and len(token) > 1
    ]


def normalize_role_text(text: str) -> str:
    """Normalize role/search text for scraper-specific routing."""
    return _normalize(text)


def _requirements_for_query(query_title: str) -> list[str | frozenset[str]]:
    requirements: list[str | frozenset[str]] = []
    seen: set[str] = set()

    for token in meaningful_query_tokens(query_title):
        if token == "front":
            requirement: str | frozenset[str] = frozenset({"frontend"})
        elif token == "back":
            requirement = frozenset({"backend"})
        else:
            requirement = _TOKEN_TO_GROUP.get(token, token)
        key = "|".join(sorted(requirement)) if isinstance(requirement, frozenset) else requirement
        if key in seen:
            continue
        seen.add(key)
        requirements.append(requirement)

    return requirements


def _requirement_matches(
    requirement: str | frozenset[str],
    candidate_tokens: set[str],
    candidate_norm: str,
) -> bool:
    if isinstance(requirement, frozenset):
        return any(
            token in candidate_tokens or re.search(rf"\b{re.escape(token)}\b", candidate_norm)
            for token in requirement
        )

    return (
        requirement in candidate_tokens
        or re.search(rf"\b{re.escape(requirement)}\b", candidate_norm) is not None
    )


def _join_text(candidate_title: str, supplemental_text: str | Iterable[str]) -> str:
    if isinstance(supplemental_text, str):
        return f"{candidate_title} {supplemental_text}"
    return " ".join([candidate_title, *[str(item) for item in supplemental_text]])


def _normalize(text: str) -> str:
    normalized = (text or "").lower()
    normalized = normalized.replace("&amp;", "and")
    for pattern, replacement in _NORMALIZE_REPLACEMENTS:
        normalized = re.sub(pattern, replacement, normalized)
    normalized = re.sub(r"[^a-z0-9+#.]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _tokens(text: str) -> list[str]:
    return _WORD_RE.findall(text)
