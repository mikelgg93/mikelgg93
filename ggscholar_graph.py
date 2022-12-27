# Python 3.10
# Function to scrap from the web the number of citations per year of a paper in google scholar.
# URL: URL of the paper or author in google scholar.
# Returns: a graph with the year and the number of citations.
# Author: Miguel García García

import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np
import logging
import asyncio

logging.basicConfig(level=logging.INFO)


async def playwright_getweb(URL, div_base, div_year, div_citations, div_title=None):
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(URL)
        await page.content()
        # Get the citations per year
        base = await page.query_selector_all(div_base)
        years = await page.query_selector_all(div_year)
        y = {i: await year.inner_text() for i, year in enumerate(years)}
        citations = await page.query_selector_all(div_citations)
        c = {i: await citation.inner_html() for i, citation in enumerate(citations)}
        citations_per_year = {y[i]: c[i] for i in range(len(y))}
        logging.info("Citations per year: " + str(citations_per_year))

        # Get the title of the paper if paper
        if div_title is not None:
            ts = await page.query_selector_all(div_title)
            title = {i: await t.inner_text() for i, t in enumerate(ts)}
            title = title[0]
            logging.info("Title: " + title)
        else:
            title = None
        await asyncio.sleep(1)  # Wait for 1 second
    return citations_per_year, title


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
    citations_per_year, title = await playwright_getweb(
        URL, base_class, years_class, citations_class, title_class
    )
    if not citations_per_year or citations_per_year == []:
        logging.info("No data available")
    else:
        bar_plot(citations_per_year, title, out_path)
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
        x=np.fromiter(citations_per_year.keys(), dtype=int),
        y=np.fromiter(citations_per_year.values(), dtype=int),
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
    parser.add_argument("--out", type=str, default=None, help="Output path.")
    parser.add_argument("--type", choices=["profile", "paper"], default="profile")
    args = parser.parse_args()
    logging.info(
        f"Withdrawing the number of citations per year of the {args.type} {args.ID}"
    )
    asyncio.run(ggscholar_scrap(args.ID, args.type, args.out))
