"""Tests for the bar_plot function (no network required)."""

import tempfile
from pathlib import Path

from upath import UPath

from scholar.plot import bar_plot

SAMPLE_DATA = [
    {"year": "2020", "citations": "5"},
    {"year": "2021", "citations": "12"},
    {"year": "2022", "citations": "38"},
    {"year": "2023", "citations": "41"},
]


def test_bar_plot_creates_file():
    """bar_plot should save a PNG file at the requested path."""
    with tempfile.TemporaryDirectory() as tmp:
        out = UPath(tmp) / "barplot.png"
        bar_plot(SAMPLE_DATA, "Test Profile", out)
        assert out.exists(), "barplot.png was not created"
        assert out.stat().st_size > 0, "barplot.png is empty"


def test_bar_plot_default_path():
    """bar_plot with out_path=None should write citations_per_year.png in cwd."""
    import os

    original_dir = os.getcwd()
    with tempfile.TemporaryDirectory() as tmp:
        os.chdir(tmp)
        try:
            bar_plot(SAMPLE_DATA, "Test Profile", None)
            assert Path("citations_per_year.png").exists()
        finally:
            os.chdir(original_dir)


def test_bar_plot_single_entry():
    """bar_plot should not crash on a single data point (xlim branch)."""
    with tempfile.TemporaryDirectory() as tmp:
        out = UPath(tmp) / "barplot.png"
        bar_plot([{"year": "2024", "citations": "7"}], "Solo", out)
        assert out.exists()


def test_bar_plot_empty_title():
    """bar_plot should accept an empty string title."""
    with tempfile.TemporaryDirectory() as tmp:
        out = UPath(tmp) / "barplot.png"
        bar_plot(SAMPLE_DATA, "", out)
        assert out.exists()
