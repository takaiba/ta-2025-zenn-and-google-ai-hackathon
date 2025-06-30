import pytest

from tasks.core.environment_variables import (
    _GEASY_ENVIRONMENT,
)


@pytest.fixture(autouse=True)
def set_environment(monkeypatch):
    monkeypatch.setenv(_GEASY_ENVIRONMENT.env_name, "test")
    monkeypatch.setenv("OPENAI_API_KEY", "localhost")
    monkeypatch.setenv(
        "GOOGLE_APPLICATION_CREDENTIALS",
        "tests/mocks/service_account_credentials.json",
    )
    monkeypatch.setenv(
        "DIFY_API_KEY_SUMMARIZE_MINUTE",
        "test",
    )
