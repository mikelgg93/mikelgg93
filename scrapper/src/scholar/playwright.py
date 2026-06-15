import asyncio
import logging
import operator

from scrapling import StealthyFetcher


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
    existing_publications: list[dict] | None = None,
):
    fetcher = StealthyFetcher(headless=True)
    page = await fetcher.async_fetch(URL)

    # Get the citations per year
    years = page.css(div_year)
    y_values = {i: year.get_all_text() for i, year in enumerate(years)}

    citations = page.css(div_citations)
    if not citations:
        logging.info("No citations found")
        return [], [], None

    c_values = {i: citation.get_all_text() for i, citation in enumerate(citations)}
    citations_per_year = [
        {"year": y, "citations": c}
        for y, c in zip(y_values.values(), c_values.values(), strict=False)
    ]
    logging.info("Citations per year: " + str(citations_per_year))

    # Get list of articles with title, citation and year (profile mode only).
    publications_data: list[dict] = []
    if article_title and article_citations and article_year and article_links:
        at_elements = page.css(article_title)
        at_values = [at.get_all_text() for at in at_elements][2:]
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

        ac_elements = page.css(article_citations)
        ac_values = [ac.get_all_text() for ac in ac_elements][2:]

        ay_elements = page.css(article_year)
        ay_values = [ay.get_all_text() for ay in ay_elements][2:]

        al_elements = page.css(article_links)
        al_values = [al.attrib.get("href") for al in al_elements]

        updated_urls: list[str] = []
        og_images: list[str | None] = []

        existing_dict = {
            p["title"]: {"link": p.get("link"), "image": p.get("image")}
            for p in (existing_publications or [])
        }

        for i, al_href in enumerate(al_values):
            if not al_href:
                updated_urls.append(None)
                og_images.append(None)
                continue

            title = at_values_split[i] if i < len(at_values_split) else None
            if title and title in existing_dict:
                updated_urls.append(existing_dict[title]["link"])
                og_images.append(existing_dict[title]["image"])
                continue

            article_url = "https://scholar.google.com/" + al_href
            try:
                article_page = await fetcher.async_fetch(article_url)
            except Exception:
                updated_urls.append(None)
                og_images.append(None)
                continue

            links = article_page.css(".gsc_oci_title_link")
            found = False
            for link in links:
                href = link.attrib.get("href")
                if href:
                    updated_urls.append(href)
                    try:
                        final_page = await fetcher.async_fetch(href)
                        og_image = final_page.css('meta[property="og:image"]')
                        if og_image:
                            content = og_image[0].attrib.get("content")
                            og_images.append(content)
                        else:
                            twitter_image = final_page.css('meta[name="twitter:image"]')
                            if twitter_image:
                                content = twitter_image[0].attrib.get("content")
                                og_images.append(content)
                            else:
                                og_images.append(None)
                    except Exception:
                        og_images.append(None)
                    found = True
                    break

            if not found:
                updated_urls.append(None)
                og_images.append(None)

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
        ts = page.css(div_title)
        title = ts[0].get_all_text() if ts else None
        logging.info("Title: " + str(title))
    else:
        title = None

    await asyncio.sleep(1)  # Wait for 1 second
    return citations_per_year, publications_data, title
