# Python 3.10
# Function to scrap from the web the number of citations per year of a paper in google scholar.
# URL: URL of the paper or author in google scholar.
# Returns: a graph with the year and the number of citations.
# Author: Miguel García García

import asyncio
import json
import logging
import os
from typing import Optional

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from rich.logging import RichHandler

logging.basicConfig(
    format="%(message)s",
    datefmt="[%X]",
    level=logging.INFO,
    handlers=[RichHandler(rich_tracebacks=True)],
)


async def playwright_getweb(
    URL: str,
    div_base: str,
    div_year: str,
    div_citations: str,
    div_title: Optional[str] = None,
    article_title: Optional[str] = None,
    article_links: Optional[str] = None,
    article_citations: Optional[str] = None,
    article_year: Optional[str] = None,
):
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(URL)
        await page.content()
        # Get the citations per year
        base = await page.query_selector_all(div_base)
        years = await page.query_selector_all(div_year)
        y_values = {i: await year.inner_text() for i, year in enumerate(years)}
        citations = await page.query_selector_all(div_citations)
        c_values = {
            i: await citation.inner_html() for i, citation in enumerate(citations)
        }
        citations_per_year = [
            {"year": y, "citations": c}
            for y, c in zip(y_values.values(), c_values.values())
        ]
        logging.info("Citations per year: " + str(citations_per_year))

        # Get list of articles with title, citation and year.
        at = await page.query_selector_all(article_title)
        at_values = list(
            {i: await at.inner_text() for i, at in enumerate(at)}.values()
        )[2:]
        at_values, au_values, details = zip(
            *(
                [
                    (
                        parts[0],
                        parts[1] if len(parts) > 1 else "",
                        parts[2] if len(parts) > 2 else "",
                    )
                    for parts in (value.split("\n", 2) for value in at_values)
                ]
            )
        )
        ac = await page.query_selector_all(article_citations)
        ac_values = list(
            {i: await ac.inner_text() for i, ac in enumerate(ac)}.values()
        )[2:]
        ay = await page.query_selector_all(article_year)
        ay_values = list(
            {i: await ay.inner_text() for i, ay in enumerate(ay)}.values()
        )[2:]
        al = await page.query_selector_all(article_links)
        al_values = list(
            {i: await al.get_attribute("href") for i, al in enumerate(al)}.values()
        )
        updated_urls, og_images = [], []
        page_new = await browser.new_page()
        for al in al_values:
            await page_new.goto("https://scholar.google.com/" + al)
            await page_new.content()
            links = await page_new.query_selector_all(".gsc_oci_title_link")
            for link in links:
                href = await link.get_attribute("href")
                tab = await browser.new_page()
                if href:
                    updated_urls.append(href)
                    await tab.goto(href)
                    await tab.content()
                    og_image = await page_new.query_selector(
                        'meta[property="og:image"]'
                    )
                    if og_image:
                        content = await og_image.get_attribute("content")
                        og_images.append(content)
                    else:
                        twitter_image = await page_new.query_selector(
                            'meta[name="twitter:image"]'
                        )
                        if twitter_image:
                            content = await twitter_image.get_attribute("content")
                            og_images.append(content)
                        else:
                            og_images.append(None)
                    await tab.close()
                    break
        await page_new.close()

        # Merge
        publications_data = [
            {
                "title": t,
                "authors": a,
                "details": d,
                "citations": c,
                "year": y,
                "link": li,
                "image": i,
            }
            for t, a, d, c, y, li, i in zip(
                at_values,
                au_values,
                details,
                ac_values,
                ay_values,
                updated_urls,
                og_images,
            )
        ]
        publications_data = sorted(
            [
                paper
                for paper in publications_data
                if not (paper["year"] < "2022" and paper["citations"] == "")
            ],
            key=lambda x: x["year"],
            reverse=True,
        )
        logging.info("Publications: " + str(publications_data))

        # Get the title of the paper if paper
        if div_title is not None:
            ts = await page.query_selector_all(div_title)
            title = {i: await t.inner_text() for i, t in enumerate(ts)}
            title = title[0]
            logging.info("Title: " + title)
        else:
            title = None
        await asyncio.sleep(1)  # Wait for 1 second
    return citations_per_year, publications_data, title


async def ggscholar_scrap(ID="P1qW5Z0AAAAJ", type="profile", out_path=None):
    userID = ID if type == "profile" else ID.split(":")[0]
    paperID = None if type == "profile" else ID.split(":")[1]
    URL = (
        ("https://scholar.google.com/citations?user=" + userID + "&hl=en&oi=ao")
        if type == "profile"
        else (
            "https://scholar.google.com/citations?view_op=view_citation&hl=en&user="
            + userID
            + "&sortby=pubdate&citation_for_view="
            + userID
            + ":"
            + paperID
        )
    )
    base_class = ".gsc_g_t" if type == "profile" else ".gsc_oci"
    years_class = ".gsc_g_t" if type == "profile" else ".gsc_oci_g_t"
    citations_class = ".gsc_g_al" if type == "profile" else ".gsc_oci_g_al"
    title_class = ".gsc_oci_title_link" if type == "paper" else None
    article_title = ".gsc_a_t" if type == "profile" else None
    article_citations = ".gsc_a_c" if type == "profile" else None
    article_year = ".gsc_a_y" if type == "profile" else None
    article_links = ".gsc_a_at" if type == "profile" else None
    citations_per_year, publications_data, title = await playwright_getweb(
        URL,
        base_class,
        years_class,
        citations_class,
        title_class,
        article_title,
        article_links,
        article_citations,
        article_year,
    )
    if not citations_per_year or citations_per_year == []:
        logging.info("No data available")
    else:
        img_path = (
            os.path.join(out_path, "barplot.png")
            if out_path is not None
            else os.path.join(os.curdir, "barplot.png")
        )
        bar_plot(citations_per_year, title, img_path)

    combined_data = {"perYear": citations_per_year, "articles": publications_data}
    # Save as a file
    file_path = (
        os.path.join(out_path, "citations.json")
        if out_path is not None
        else os.path.join(os.curdir, "citations.json")
    )
    with open(file_path, "w") as file:
        json.dump(combined_data, file, indent=4)
    logging.info("Updated JSON")
    return


def make_a_list(years, citations):
    # Get the years from histogram
    years_list = []
    for year in years:
        years_list.append(int(year.text))
    # Get the citations from histogram
    citations_list = []
    for citation in citations:
        citations_list.append(int(citation.text))
    return (years_list, citations_list)


def bar_plot(citations_per_year, title="", out_path=None):
    # Bar plot using seaborn
    sns.set(style="ticks", color_codes=True)
    sns.set_context("notebook", font_scale=1)
    ax = sns.barplot(
        x=np.array([entry["year"] for entry in citations_per_year], dtype=int),
        y=np.array([entry["citations"] for entry in citations_per_year], dtype=int),
        color="#777777",
    )
    ax.bar_label(ax.containers[0])
    plt.ylabel("Citations")
    plt.xlabel("Year")
    plt.title(title)
    if len(citations_per_year) < 2:
        plt.xlim([-1, 4])
    plt.draw()
    plt.savefig("citations_per_year.png" if out_path is None else out_path)
    logging.info(
        "Saved to " + "citations_per_year.png" if out_path is None else out_path
    )
    return


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Scrap the number of citations per year of a profile/paper in google scholar."
    )
    parser.add_argument(
        "--ID",
        type=str,
        default="P1qW5Z0AAAAJ",
        help="ID of the profile/paper in google scholar.",
    )
    parser.add_argument(
        "--out", type=str, default="components/data", help="Output path."
    )
    parser.add_argument("--type", choices=["profile", "paper"], default="profile")
    args = parser.parse_args()
    logging.info(
        f"Withdrawing the number of citations per year of the {args.type} {args.ID}"
    )
    asyncio.run(ggscholar_scrap(args.ID, args.type, args.out))
