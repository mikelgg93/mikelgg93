import logging

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from upath import UPath


def bar_plot(citations_per_year, title: str = "", out_path: UPath | None = None):
    """Bar plot mimicking GScholar graph style, using seaborn and matplotlib.

    Args:
        citations_per_year (list): List of dicts with 'year' and 'citations' keys.
        title (str, optional): Title of the plot. Defaults to "".
        out_path (UPath, optional): Path to save the plot. Defaults to None.

    """
    sns.set_theme(style="ticks", color_codes=True)
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
