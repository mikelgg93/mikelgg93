"""Saved-profile imports must preserve unrelated and previously valid data."""

import json

import pytest

from scholar.snapshot import import_snapshot, parse_snapshot


def snapshot(years=("2025", "2026"), counts=("1,234", "20")):
    return (
        '<meta charset="utf-8"><div id="gsc_prf_in">Miguel García García</div>'
        + "".join(f'<span class="gsc_g_t">{year}</span>' for year in years)
        + "".join(f'<span class="gsc_g_al">{count}</span>' for count in counts)
    ).encode()


def test_valid_graph():
    assert parse_snapshot(snapshot(), 2026) == [
        {"year": "2025", "citations": "1234"},
        {"year": "2026", "citations": "20"},
    ]
    assert parse_snapshot(snapshot(counts=("0", "20")), 2026)[0]["citations"] == "0"


@pytest.mark.parametrize(
    "html",
    [
        b"<html>Verify you are human</html>",
        snapshot().replace(b"Miguel", b"Other"),
        snapshot(years=("2026", "2026")),
        snapshot(counts=("20",)),
        snapshot(counts=("-1", "20")),
        snapshot(counts=("1.2k", "20")),
        snapshot(years=("2024", "2025")),
        snapshot(years=("2026", "2027")),
        snapshot()
        + b'<link rel="canonical" href="https://scholar.google.com/citations?user=other">',
    ],
)
def test_reject_invalid_snapshot(html):
    with pytest.raises(ValueError):
        parse_snapshot(html, 2026)


def existing_files(path):
    data = {
        "perYear": [{"year": "2019", "citations": "2"}],
        "articles": [{"title": "Keep this publication"}],
    }
    (path / "citations.json").write_text(json.dumps(data))
    (path / "barplot.png").write_bytes(b"previous chart")
    return data


def test_import_preserves_publications_and_older_years(tmp_path):
    existing = existing_files(tmp_path)
    import_snapshot(snapshot(), tmp_path, 2026)
    updated = json.loads((tmp_path / "citations.json").read_text())
    assert updated["articles"] == existing["articles"]
    assert updated["perYear"][0] == existing["perYear"][0]
    assert updated["perYear"][-1] == {"year": "2026", "citations": "20"}
    assert (tmp_path / "barplot.png").read_bytes().startswith(b"\x89PNG")


def test_invalid_import_preserves_files(tmp_path):
    existing = existing_files(tmp_path)
    with pytest.raises(ValueError):
        import_snapshot(b"blocked", tmp_path, 2026)
    assert json.loads((tmp_path / "citations.json").read_text()) == existing
    assert (tmp_path / "barplot.png").read_bytes() == b"previous chart"


def test_plot_failure_preserves_files(tmp_path, monkeypatch):
    existing = existing_files(tmp_path)

    def fail_plot(*args):
        raise OSError("Cannot render plot")

    monkeypatch.setattr("scholar.snapshot.bar_plot", fail_plot)
    with pytest.raises(OSError):
        import_snapshot(snapshot(), tmp_path, 2026)
    assert json.loads((tmp_path / "citations.json").read_text()) == existing
    assert (tmp_path / "barplot.png").read_bytes() == b"previous chart"
