from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional


def _env_text(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.environ.get(name, default)
    if value is None:
        return None
    cleaned = value.strip().strip('"').strip("'")
    return cleaned or None


def _env_int(name: str, default: int, *, minimum: Optional[int] = None, maximum: Optional[int] = None) -> int:
    raw_value = _env_text(name)
    try:
        parsed = int(raw_value) if raw_value is not None else default
    except ValueError:
        parsed = default

    if minimum is not None:
        parsed = max(parsed, minimum)
    if maximum is not None:
        parsed = min(parsed, maximum)

    return parsed


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    request_timeout_seconds: int
    refresh_interval_seconds: int
    detail_live_ttl_seconds: int
    detail_static_ttl_seconds: int
    media_ttl_seconds: int
    stale_dashboard_ttl_seconds: int
    source_home: str
    live_scores_path: str
    default_series_filter: Optional[str]
    user_agent: str

    @property
    def live_scores_url(self) -> str:
        return f"{self.source_home.rstrip('/')}/{self.live_scores_path.lstrip('/')}"


def load_settings() -> Settings:
    return Settings(
        host=_env_text("CRICKET_API_HOST", "127.0.0.1") or "127.0.0.1",
        port=_env_int("PORT", 8787),
        request_timeout_seconds=_env_int("CRICKET_REQUEST_TIMEOUT_SECONDS", 20, minimum=5, maximum=60),
        refresh_interval_seconds=_env_int("CRICKET_REFRESH_SECONDS", 5, minimum=5, maximum=30),
        detail_live_ttl_seconds=_env_int("CRICKET_DETAIL_LIVE_TTL_SECONDS", 5, minimum=5, maximum=60),
        detail_static_ttl_seconds=_env_int("CRICKET_DETAIL_STATIC_TTL_SECONDS", 180, minimum=30, maximum=1800),
        media_ttl_seconds=_env_int("CRICKET_MEDIA_TTL_SECONDS", 900, minimum=60, maximum=3600),
        stale_dashboard_ttl_seconds=_env_int("CRICKET_STALE_DASHBOARD_TTL_SECONDS", 600, minimum=60, maximum=3600),
        source_home=_env_text("CRICKET_SOURCE_HOME", "https://www.cricbuzz.com") or "https://www.cricbuzz.com",
        live_scores_path=_env_text("CRICKET_SOURCE_LIVE_PATH", "/cricket-match/live-scores") or "/cricket-match/live-scores",
        default_series_filter=_env_text("CRICKET_SERIES_FILTER"),
        user_agent=_env_text(
            "CRICKET_HTTP_USER_AGENT",
            (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36"
            ),
        )
        or (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36"
        ),
    )
