"""
Natural language query parser.

Uses the proven deterministic parser (ported from job-scrapper) to extract a
clean role + location. Optionally refines with DeepSeek when a key is set.
"""

import re
import json
import httpx

from app.scrapers.base import ParsedQuery
from app.config import settings

_PREFIX_RE = re.compile(r"^(?:find|show|search|fetch|get|list|look\s+for|looking\s+for)\s+", re.IGNORECASE)
_ROLE_WORD_RE = re.compile(r"\b(?:jobs?|roles?|openings?|vacancies|positions?)\b", re.IGNORECASE)
_LOCATION_RE = re.compile(r"\b(?:in|at|near)\s+([a-zA-Z][a-zA-Z\s,./-]*)$", re.IGNORECASE)
_REMOTE_RE = re.compile(r"\b(?:remote|work\s+from\s+home|wfh)\b", re.IGNORECASE)

_COMMON_FIXES = {"prodcut": "product", "manger": "manager", "pyhton": "python"}
_ACRONYMS = {
    "pm": "Product Manager",
    "sde": "Software Development Engineer",
    "qa": "QA Engineer",
    "ui ux": "UI UX Designer",
    "ui/ux": "UI UX Designer",
}
_TITLE_REPLACEMENTS = {
    "Ai": "AI", "Ml": "ML", "Qa": "QA", "Ui": "UI", "Ux": "UX", "Sde": "SDE",
    "Api": "API", "Ios": "iOS", "Hr": "HR", "It": "IT", "Sql": "SQL", "Devops": "DevOps",
}


async def parse_query(raw_query: str) -> ParsedQuery:
    """Parse a freeform query. Deterministic by default; LLM-refined if available."""
    parsed = _deterministic_parse(raw_query)

    if settings.DEEPSEEK_API_KEY:
        try:
            return await _llm_parse(raw_query, fallback=parsed)
        except Exception as e:
            print(f"[QueryParser] LLM parse failed: {e}; using deterministic parse")

    return parsed


def _deterministic_parse(query: str) -> ParsedQuery:
    original = query
    text = re.sub(r"\s+", " ", query or "").strip()
    if not text:
        return ParsedQuery(role="", raw_query=original)

    for wrong, right in _COMMON_FIXES.items():
        text = re.sub(rf"\b{wrong}\b", right, text, flags=re.IGNORECASE)

    text = _PREFIX_RE.sub("", text).strip()

    location = None
    remote = None
    if _REMOTE_RE.search(text):
        location = "Remote"
        remote = True
        text = _REMOTE_RE.sub("", text).strip()

    loc_match = _LOCATION_RE.search(text)
    if loc_match:
        location = _format_location(loc_match.group(1))
        text = text[: loc_match.start()].strip()

    text = _ROLE_WORD_RE.sub("", text)
    text = re.sub(r"\b(?:for|as|a|an)\b", " ", text, flags=re.IGNORECASE)
    role = _format_role(text)

    return ParsedQuery(role=role, location=location, remote=remote, keywords=[], raw_query=original)


def _format_location(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip(" ,./-")).strip()
    if value.lower() == "remote":
        return "Remote"
    return value.title()


def _format_role(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip(" ,./-")).strip()
    lower = value.lower()
    if lower in _ACRONYMS:
        return _ACRONYMS[lower]
    title = value.title()
    for old, new in _TITLE_REPLACEMENTS.items():
        title = re.sub(rf"\b{old}\b", new, title)
    return title


async def _llm_parse(raw_query: str, fallback: ParsedQuery) -> ParsedQuery:
    system = (
        "You are a job search query parser. Extract JSON with fields: "
        "role (string), location (string or null), remote (boolean or null). "
        "Return ONLY valid JSON."
    )
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": settings.DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": raw_query},
                ],
                "temperature": 0.1,
                "max_tokens": 200,
            },
        )
        resp.raise_for_status()
        data = resp.json()
    content = data["choices"][0]["message"]["content"].strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    obj = json.loads(content)
    role = (obj.get("role") or "").strip() or fallback.role
    return ParsedQuery(
        role=_format_role(role),
        location=(obj.get("location") or fallback.location),
        remote=obj.get("remote", fallback.remote),
        keywords=[],
        raw_query=raw_query,
    )
