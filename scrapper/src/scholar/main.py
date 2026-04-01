import asyncio
import json
import logging
import os
from enum import Enum
from pathlib import Path

import typer
from rich.logging import RichHandler
from upath import UPath

from scholar.playwright import playwright_getweb
from scholar.plot import bar_plot

logging.basicConfig(
    format="%(message)s",
    datefmt="[%X]",
    level=logging.INFO,
    handlers=[RichHandler(rich_tracebacks=True)],
)

app = typer.Typer(
    name="scholar",
    help="Scrape citation data from a Google Scholar profile or paper.",
    add_completion=False,
)


class ScrapType(str, Enum):
    profile = "profile"
    paper = "paper"


async def ggscholar_scrap(
    scholar_id: str = "P1qW5Z0AAAAJ",
    scrap_type: str = "profile",
    out_path: str | None = None,
) -> None:
    """Core scraping logic — async, testable independently of the CLI."""
    user_id = scholar_id if scrap_type == "profile" else scholar_id.split(":")[0]
    paper_id = None if scrap_type == "profile" else scholar_id.split(":")[1]

    if scrap_type == "profile":
        url = f"https://scholar.google.com/citations?user={user_id}&hl=en&oi=ao"
    else:
        url = (
            "https://scholar.google.com/citations?view_op=view_citation"
            f"&hl=en&user={user_id}&sortby=pubdate"
            f"&citation_for_view={user_id}:{paper_id or ''}"
        )

    base_class = ".gsc_g_t" if scrap_type == "profile" else ".gsc_oci"
    years_class = ".gsc_g_t" if scrap_type == "profile" else ".gsc_oci_g_t"
    citations_class = ".gsc_g_al" if scrap_type == "profile" else ".gsc_oci_g_al"
    title_class = ".gsc_oci_title_link" if scrap_type == "paper" else None
    article_title = ".gsc_a_t" if scrap_type == "profile" else None
    article_citations = ".gsc_a_c" if scrap_type == "profile" else None
    article_year = ".gsc_a_y" if scrap_type == "profile" else None
    article_links = ".gsc_a_at" if scrap_type == "profile" else None

    citations_per_year, publications_data, title = await playwright_getweb(
        url,
        base_class,
        years_class,
        citations_class,
        title_class,
        article_title,
        article_links,
        article_citations,
        article_year,
    )

    if not citations_per_year:
        logging.info("No citation data available")
    else:
        img_path = (
            os.path.join(out_path, "barplot.png")
            if out_path
            else os.path.join(os.curdir, "barplot.png")
        )
        bar_plot(citations_per_year, title, UPath(img_path))

    combined_data: dict = {"perYear": citations_per_year, "articles": publications_data}
    if combined_data:
        file_path = (
            os.path.join(out_path, "citations.json")
            if out_path
            else os.path.join(os.curdir, "citations.json")
        )
        with Path(file_path).open("w") as f:
            json.dump(combined_data, f, indent=4)
        logging.info("Updated JSON")
    else:
        logging.info("No data available")


@app.command()
def scrape(
    scholar_id: str = typer.Option(
        "P1qW5Z0AAAAJ",
        "--id",
        help="Google Scholar profile or paper ID.",
        show_default=True,
    ),
    out: str = typer.Option(
        ".",
        "--out",
        help="Output directory for barplot.png and citations.json.",
        show_default=True,
    ),
    scrap_type: ScrapType = typer.Option(
        ScrapType.profile,
        "--type",
        help="Whether to scrape a profile or a specific paper.",
        show_default=True,
    ),
) -> None:
    """Scrape Google Scholar citation data and generate a bar plot."""
    logging.info(f"Scraping {scrap_type.value} with ID: {scholar_id}")
    asyncio.run(ggscholar_scrap(scholar_id, scrap_type.value, out))
