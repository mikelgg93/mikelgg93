# Python 3.10
# Function to scrap from the web the number of citations per year of a paper in google scholar.
# URL: URL of the paper or author in google scholar.
# Returns: a graph with the year and the number of citations.
# Author: Miguel García García

from itertools import count
import seaborn as sns
import requests
from bs4 import BeautifulSoup
import matplotlib.pyplot as plt
import numpy as np
import logging

logging.basicConfig(level=logging.INFO)


def ggscholar_profile(userID="P1qW5Z0AAAAJ", out_path=None):
    URL = "https://scholar.google.com/citations?user=" + userID + "&hl=en&oi=ao"
    # Page source of the URL
    soup = BeautifulSoup(requests.get(URL).text, "html.parser")
    # Find the div with the class "gsc_a_t" for years and "gsc_g_al" for citations
    years = soup.find_all("span", class_="gsc_g_t")
    citations = soup.find_all("span", class_="gsc_g_al")
    [years_list, citations_list] = make_a_list(years, citations)
    bar_plot(years_list, citations_list, "", out_path)
    return


def ggscholar_paper(paperID="P1qW5Z0AAAAJ:eQOLeE2rZwMC", out_path=None):
    authID = paperID.split(":")[0]
    paperID = paperID.split(":")[1]
    URL = (
        "https://scholar.google.com/citations?view_op=view_citation&hl=en&user="
        + authID
        + "&sortby=pubdate&citation_for_view="
        + authID
        + ":"
        + paperID
    )
    soup = BeautifulSoup(requests.get(URL).text, "html.parser")
    years = soup.find_all("span", class_="gsc_oci_g_t")
    citations = soup.find_all("span", class_="gsc_oci_g_al")
    title = soup.find_all("a", class_="gsc_oci_title_link")[0].text
    [years_list, citations_list] = make_a_list(years, citations)
    if not years_list:
        logging.info("No data available")
    else:
        bar_plot(years_list, citations_list, title, out_path)
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


def bar_plot(years_list, citations_list, title="", out_path=None):
    # Bar plot using seaborn
    sns.set(style="ticks", color_codes=True)
    sns.set_context("notebook", font_scale=1)
    ax = sns.barplot(x=years_list, y=citations_list, color="#777777")
    ax.bar_label(ax.containers[0])
    plt.ylabel("Citations")
    plt.xlabel("Year")
    plt.title(title)
    if np.size(years_list) < 2:
        plt.xlim([-1, 4])
    plt.draw()
    if out_path is not None:
        plt.savefig(out_path)
        logging.info("Saved to " + out_path)
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
        "--pp", type=str, default="profile", help="Type of ID. Profile or paper."
    )
    parser.add_argument("--out", type=str, default=None, help="Output path.")
    args = parser.parse_args()
    if args.pp == "profile":
        logging.info(
            f"Withdrawing the number of citations per year of the profile {args.ID}"
        )
        ggscholar_profile(args.ID, args.out)
    elif args.pp == "paper":
        logging.info(
            f"Withdrawing the number of citations per year of the paper {args.ID}."
        )
        ggscholar_paper(args.ID, args.out)
    else:
        error = "The type of ID must be 'profile' or 'paper'."
        logging.error(error)
        raise ValueError(error)
