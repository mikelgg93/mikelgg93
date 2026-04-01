import asyncio
import logging
import operator

from playwright.async_api import async_playwright
from playwright_stealth import stealth_async


async def playwright_getweb(
    URL: str,
    div_base: str,
    div_year: str,
    div_citations: str,
    div_title: str | None = None,
    article_title: str | None = None,
    article_links: str | None = None,
    article_citations: str | None = None,
    article_year: str | None = None,
):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await stealth_async(page)
        await page.goto(URL)
        await page.content()
        # Get the citations per year
        await page.query_selector_all(div_base)
        years = await page.query_selector_all(div_year)
        y_values = {i: await year.inner_text() for i, year in enumerate(years)}
        citations = await page.query_selector_all(div_citations)
        if not citations:
            logging.info("No citations found")
            return [], [], None
        c_values = {
            i: await citation.inner_html() for i, citation in enumerate(citations)
        }
        citations_per_year = [
            {"year": y, "citations": c}
            for y, c in zip(y_values.values(), c_values.values(), strict=False)
        ]
        logging.info("Citations per year: " + str(citations_per_year))

        # Get list of articles with title, citation and year (profile mode only).
        publications_data: list[dict] = []
        if article_title and article_citations and article_year and article_links:
            at = await page.query_selector_all(article_title)
            at_values = list(
                {i: await at.inner_text() for i, at in enumerate(at)}.values()
            )[2:]
            at_values_split, au_values, details = zip(
                *([
                    (
                        parts[0],
                        parts[1] if len(parts) > 1 else "",
                        parts[2] if len(parts) > 2 else "",
                    )
                    for parts in (value.split("\n", 2) for value in at_values)
                ]),
                strict=False,
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
            updated_urls: list[str] = []
            og_images: list[str | None] = []
            page_new = await browser.new_page()
            for al_href in al_values:
                if al_href is None:
                    continue
                await page_new.goto("https://scholar.google.com/" + al_href)
                await page_new.content()
                links = await page_new.query_selector_all(".gsc_oci_title_link")
                for link in links:
                    href = await link.get_attribute("href")
                    if href:
                        updated_urls.append(href)
                        try:
                            await page_new.goto(href)
                            await page_new.wait_for_load_state()
                            await asyncio.sleep(0.5)
                            await page_new.content()
                        except Exception:
                            break
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
                    "image": img,
                }
                for t, a, d, c, y, li, img in zip(
                    at_values_split,
                    au_values,
                    details,
                    ac_values,
                    ay_values,
                    updated_urls,
                    og_images,
                    strict=False,
                )
            ]
            publications_data = sorted(
                [
                    paper
                    for paper in publications_data
                    if not (paper["year"] < "2022" and paper["citations"] == "")
                ],
                key=operator.itemgetter("year"),
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
