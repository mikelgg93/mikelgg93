"""Update the yearly Scholar graph through SerpApi's Google Scholar Author API."""

import argparse
import json
import os
import re
from datetime import date
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from scholar.snapshot import MAX_BYTES, PROFILE_ID, write_citations


def parse_response(data: dict, current_year: int) -> list[dict[str, str]]:
    """Validate a successful response for the intended author before writing."""
    if data.get("error") or data.get("search_metadata", {}).get("status") != "Success":
        raise ValueError("SerpApi did not return a successful result.")
    if data.get("search_parameters", {}).get("author_id") != PROFILE_ID:
        raise ValueError("SerpApi returned a different author profile.")
    graph = data.get("cited_by", {}).get("graph")
    if not isinstance(graph, list) or not graph:
        raise ValueError("SerpApi returned no citation graph.")
    rows = {}
    for entry in graph:
        year = str(entry["year"])
        count = str(entry["citations"])
        if not re.fullmatch(r"[0-9]{4}", year) or not 1900 <= int(year) <= current_year:
            raise ValueError("Invalid citation year.")
        if year in rows or not re.fullmatch(r"[0-9]+", count):
            raise ValueError("Duplicate year or invalid citation count.")
        rows[year] = {"year": year, "citations": str(int(count))}
    if str(current_year) not in rows:
        raise ValueError(
            "Citation graph lacks the current year; existing data retained."
        )
    return sorted(rows.values(), key=lambda row: int(row["year"]))


def fetch_citations(api_key: str, current_year: int) -> list[dict[str, str]]:
    """Fetch once; never include the credential-bearing URL in error output."""
    if not api_key.strip():
        raise ValueError("Set the SERPAPI_API_KEY environment variable.")
    query = urlencode({
        "engine": "google_scholar_author",
        "author_id": PROFILE_ID,
        "hl": "en",
        "api_key": api_key,
    })
    try:
        with urlopen(
            f"https://serpapi.com/search.json?{query}", timeout=60
        ) as response:
            body = response.read(MAX_BYTES + 1)
    except HTTPError as error:
        raise RuntimeError(
            f"SerpApi HTTP {error.code}; check the API key and quota."
        ) from None
    except (URLError, TimeoutError):
        raise RuntimeError(
            "SerpApi connection failed; existing data retained."
        ) from None
    if len(body) > MAX_BYTES:
        raise ValueError("SerpApi response exceeds the size limit.")
    try:
        data = json.loads(body)
        return parse_response(data, current_year)
    except (KeyError, TypeError, AttributeError, ValueError):
        raise ValueError(
            "Invalid or unsuccessful SerpApi response; existing data retained."
        ) from None


def main() -> None:
    """Update counts and chart while preserving the existing publication list."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    try:
        year = date.today().year
        rows = fetch_citations(os.environ.get("SERPAPI_API_KEY", ""), year)
        write_citations(rows, args.out, year)
    except (ValueError, RuntimeError, OSError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
