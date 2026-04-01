"""Tests for the Typer CLI (scholar.main) — no network required."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from typer.testing import CliRunner

from scholar.main import app, ggscholar_scrap

runner = CliRunner()


# ---------------------------------------------------------------------------
# CLI invocation tests
# ---------------------------------------------------------------------------


def test_cli_help():
    """--help should exit cleanly and print usage information."""
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "scholar" in result.output.lower() or "scrape" in result.output.lower()


def test_cli_invalid_type():
    """Passing an invalid --type value should fail with a non-zero exit code."""
    result = runner.invoke(app, ["--type", "conference"])
    assert result.exit_code != 0


def test_cli_calls_scrape_with_defaults(monkeypatch):
    """Running with defaults should call ggscholar_scrap with expected arguments."""
    called_args: dict = {}

    async def fake_scrap(scholar_id, scrap_type, out_path):
        called_args["id"] = scholar_id
        called_args["type"] = scrap_type
        called_args["out"] = out_path

    with patch("scholar.main.ggscholar_scrap", new=fake_scrap):
        result = runner.invoke(app, [])

    assert result.exit_code == 0
    assert called_args["id"] == "P1qW5Z0AAAAJ"
    assert called_args["type"] == "profile"


def test_cli_custom_id_and_out(monkeypatch, tmp_path):
    """Custom --id and --out values should be forwarded correctly."""
    called_args: dict = {}

    async def fake_scrap(scholar_id, scrap_type, out_path):
        called_args["id"] = scholar_id
        called_args["out"] = out_path

    with patch("scholar.main.ggscholar_scrap", new=fake_scrap):
        result = runner.invoke(app, ["--id", "TESTID123", "--out", str(tmp_path)])

    assert result.exit_code == 0
    assert called_args["id"] == "TESTID123"
    assert called_args["out"] == str(tmp_path)


# ---------------------------------------------------------------------------
# Core ggscholar_scrap logic tests (mock the Playwright layer)
# ---------------------------------------------------------------------------

FAKE_CITATIONS: list[dict] = [
    {"year": "2022", "citations": "10"},
    {"year": "2023", "citations": "25"},
]

FAKE_ARTICLES: list[dict] = [
    {
        "title": "Test Paper",
        "authors": "A. Author",
        "details": "Journal X, 2023",
        "citations": "5",
        "year": "2023",
        "link": "https://example.com",
        "image": None,
    }
]


@pytest.mark.asyncio
async def test_ggscholar_scrap_writes_files(tmp_path):
    """ggscholar_scrap should write barplot.png and citations.json."""
    from scholar import plot as plot_mod

    with (
        patch(
            "scholar.main.playwright_getweb",
            new=AsyncMock(return_value=(FAKE_CITATIONS, FAKE_ARTICLES, "Test Profile")),
        ),
        patch.object(plot_mod, "bar_plot", MagicMock()),
    ):
        await ggscholar_scrap("TESTID", "profile", str(tmp_path))

    json_file = tmp_path / "citations.json"
    assert json_file.exists(), "citations.json was not created"
    data = json.loads(json_file.read_text())
    assert data["perYear"] == FAKE_CITATIONS
    assert data["articles"] == FAKE_ARTICLES


@pytest.mark.asyncio
async def test_ggscholar_scrap_no_data_no_barplot(tmp_path):
    """When playwright returns no citations, no barplot.png should be created."""
    with patch(
        "scholar.main.playwright_getweb",
        new=AsyncMock(return_value=([], [], None)),
    ):
        await ggscholar_scrap("TESTID", "profile", str(tmp_path))

    assert not (tmp_path / "barplot.png").exists(), (
        "barplot.png should not be created when there is no data"
    )


@pytest.mark.asyncio
async def test_ggscholar_scrap_paper_mode(tmp_path):
    """Paper mode should construct URL with the paper ID and not attempt article list."""
    from scholar import plot as plot_mod

    with (
        patch(
            "scholar.main.playwright_getweb",
            new=AsyncMock(return_value=(FAKE_CITATIONS, [], "Some Paper Title")),
        ) as mock_get,
        patch.object(plot_mod, "bar_plot", MagicMock()),
    ):
        await ggscholar_scrap("USERID:PAPERID", "paper", str(tmp_path))

    call_url = mock_get.call_args[0][0]
    assert "view_citation" in call_url
    assert "USERID" in call_url
    assert "PAPERID" in call_url
