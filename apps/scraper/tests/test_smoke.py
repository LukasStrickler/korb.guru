"""Smoke test for scraper scaffold."""


def test_import_ingestion():
    """Ingestion module can be imported."""
    from src.ingestion import get_mock_recipes  # noqa: F401

    assert get_mock_recipes is not None
