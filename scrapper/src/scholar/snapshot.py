"""Import a Google Scholar citation graph from saved profile HTML."""

import argparse
import json
import re
import tempfile
import unicodedata
from datetime import date
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen

from scrapling import Selector
from upath import UPath

from scholar.plot import bar_plot

MAX_BYTES = 5 * 1024 * 1024
PROFILE_ID = "P1qW5Z0AAAAJ"
PROFILE_NAME = "Miguel Garcia Garcia"


def profile_name(text: str) -> str:
    """Compare names independently of accents, case and whitespace."""
    text = unicodedata.normalize("NFKD", text)
    return " ".join(
        "".join(c for c in text if not unicodedata.combining(c)).split()
    ).casefold()


def parse_snapshot(html: bytes, current_year: int) -> list[dict[str, str]]:
    """Reject blocked, wrong-profile, incomplete or malformed snapshots."""
    if not html or len(html) > MAX_BYTES:
        raise ValueError("Snapshot must contain HTML and be no larger than 5 MiB.")
    page = Selector(content=html)
    names = page.css("#gsc_prf_in")
    if len(names) != 1 or profile_name(names[0].get_all_text()) != profile_name(
        PROFILE_NAME
    ):
        raise ValueError(
            "Expected Miguel García García's Scholar profile, "
            "not a challenge or another author."
        )
    for link in page.css('link[rel="canonical"]'):
        user = parse_qs(urlparse(link.attrib.get("href", "")).query).get("user")
        if user and user != [PROFILE_ID]:
            raise ValueError(
                "Snapshot canonical URL belongs to a different Scholar profile."
            )
    years = [node.get_all_text().strip() for node in page.css(".gsc_g_t")]
    counts = [node.get_all_text().strip() for node in page.css(".gsc_g_al")]
    if not years or len(years) != len(counts) or len(set(years)) != len(years):
        raise ValueError(
            "Missing, duplicate or incomplete citation graph; "
            "save the full profile HTML."
        )
    rows = []
    for year, count in zip(years, counts, strict=True):
        if not re.fullmatch(r"\d{4}", year) or not 1900 <= int(year) <= current_year:
            raise ValueError("Invalid citation year.")
        if not re.fullmatch(r"(?:\d+|\d{1,3}(?:,\d{3})+)", count):
            raise ValueError(
                "Invalid citation count; abbreviated counts are not supported."
            )
        rows.append({"year": year, "citations": str(int(count.replace(",", "")))})
    if str(current_year) not in years:
        raise ValueError(
            "Snapshot lacks the current year; "
            "open the current profile and save it again."
        )
    return sorted(rows, key=lambda row: int(row["year"]))


def import_snapshot(html: bytes, output: Path, current_year: int) -> None:
    """Preserve publications and older years; stage both outputs before replacing."""
    write_citations(parse_snapshot(html, current_year), output, current_year)


def write_citations(
    rows: list[dict[str, str]], output: Path, current_year: int
) -> None:
    """Write a validated graph without replacing publication metadata."""
    destination = output / "citations.json"
    existing = json.loads(destination.read_text())
    years = {row["year"]: row for row in existing["perYear"]}
    years.update({row["year"]: row for row in rows})
    existing["perYear"] = sorted(years.values(), key=lambda row: int(row["year"]))
    with tempfile.TemporaryDirectory(dir=output) as staging:
        staged = Path(staging)
        (staged / "citations.json").write_text(json.dumps(existing, indent=4))
        bar_plot(existing["perYear"], "", UPath(staged / "barplot.png"))
        (staged / "barplot.png").replace(output / "barplot.png")
        (staged / "citations.json").replace(destination)
    print(
        f"Imported {len(rows)} years; "
        f"{current_year}: {years[str(current_year)]['citations']} citations."
    )


def main() -> None:
    """Read a local saved page or an HTTPS snapshot, never execute its scripts."""
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--file", type=Path)
    source.add_argument("--url")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if args.url:
        if urlparse(args.url).scheme != "https":
            parser.error("Snapshot URL must use HTTPS.")
        with urlopen(args.url, timeout=30) as response:  # noqa: S310
            if urlparse(response.url).scheme != "https":
                parser.error("Snapshot redirect must use HTTPS.")
            html = response.read(MAX_BYTES + 1)
    else:
        with args.file.open("rb") as source_file:
            html = source_file.read(MAX_BYTES + 1)
    import_snapshot(html, args.out, date.today().year)


if __name__ == "__main__":
    main()
