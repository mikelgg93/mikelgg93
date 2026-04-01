"""Shared pytest fixtures."""

import pytest


@pytest.fixture
def sample_citations():
    return [
        {"year": "2020", "citations": "5"},
        {"year": "2021", "citations": "12"},
        {"year": "2022", "citations": "38"},
        {"year": "2023", "citations": "41"},
    ]
