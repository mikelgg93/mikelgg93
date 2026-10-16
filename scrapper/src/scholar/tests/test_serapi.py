"""Validate API results and credential-safe failures without spending API credits."""

import json
from copy import deepcopy
from unittest.mock import MagicMock
from urllib.error import HTTPError

import pytest

from scholar.serpapi import fetch_citations, parse_response

RESPONSE = {
    "search_metadata": {"status": "Success"},
    "search_parameters": {"author_id": "P1qW5Z0AAAAJ"},
    "cited_by": {
        "graph": [
            {"year": 2025, "citations": "43"},
            {"year": 2026, "citations": 20},
        ]
    },
}


def test_graph_accepts_documented_string_and_integer_counts():
    assert parse_response(RESPONSE, 2026) == [
        {"year": "2025", "citations": "43"},
        {"year": "2026", "citations": "20"},
    ]


@pytest.mark.parametrize(
    "graph",
    [
        [],
        [{"year": 2025, "citations": 1}],
        [{"year": 2027, "citations": 1}],
        [{"year": 2026, "citations": -1}],
        [{"year": 2026, "citations": True}],
        [{"year": 2026, "citations": "NaN"}],
        [{"year": 2026, "citations": 2.5}],
        [{"year": 2026, "citations": 2}] * 2,
    ],
)
def test_invalid_graph(graph):
    data = deepcopy(RESPONSE)
    data["cited_by"]["graph"] = graph
    with pytest.raises(ValueError):
        parse_response(data, 2026)


@pytest.mark.parametrize(
    "field,value",
    [
        ("error", "Quota exceeded"),
        ("search_metadata", {"status": "Processing"}),
        ("search_parameters", {"author_id": "someone-else"}),
    ],
)
def test_error_and_wrong_profile(field, value):
    data = deepcopy(RESPONSE)
    data[field] = value
    with pytest.raises(ValueError):
        parse_response(data, 2026)


def test_request(monkeypatch):
    response = MagicMock()
    response.__enter__.return_value.read.return_value = json.dumps(RESPONSE).encode()
    request = MagicMock(return_value=response)
    monkeypatch.setattr("scholar.serpapi.urlopen", request)
    assert fetch_citations("test-key", 2026)[-1]["citations"] == "20"
    assert "engine=google_scholar_author" in request.call_args.args[0]
    assert request.call_count == 1


def test_http_failure_hides_key(monkeypatch):
    request = MagicMock(
        side_effect=HTTPError(
            "https://serpapi.com/search.json?api_key=secret-value",
            429,
            "secret-value",
            None,
            None,
        )
    )
    monkeypatch.setattr("scholar.serpapi.urlopen", request)
    with pytest.raises(RuntimeError, match="HTTP 429") as error:
        fetch_citations("secret-value", 2026)
    assert "secret-value" not in str(error.value)


def test_missing_key_does_not_fetch(monkeypatch):
    request = MagicMock()
    monkeypatch.setattr("scholar.serpapi.urlopen", request)
    with pytest.raises(ValueError, match="SERPAPI_API_KEY"):
        fetch_citations("", 2026)
    request.assert_not_called()
