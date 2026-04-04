from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Optional

from .config import Settings
from .exceptions import ServiceError
from .models import DashboardPayload, MatchDetail, MatchStatus, MediaDetail
from .normalize import build_dashboard_payload, find_match_by_id, normalize_match_detail
from .sources.cricbuzz import CricbuzzSourceClient, DashboardSourceSnapshot


LOGGER = logging.getLogger(__name__)


@dataclass
class DetailCacheEntry:
    value: MatchDetail
    expires_at: float


@dataclass
class MediaCacheEntry:
    value: MediaDetail
    expires_at: float


class MatchStore:
    def __init__(self, source: CricbuzzSourceClient, settings: Settings) -> None:
        self._source = source
        self._settings = settings
        self._dashboard_snapshot: Optional[DashboardSourceSnapshot] = None
        self._dashboard_snapshot_loaded_at: Optional[float] = None
        self._detail_cache: dict[str, DetailCacheEntry] = {}
        self._media_cache: dict[str, MediaCacheEntry] = {}
        self._dashboard_lock = asyncio.Lock()
        self._detail_locks: dict[str, asyncio.Lock] = {}
        self._media_locks: dict[str, asyncio.Lock] = {}
        self._refresh_task: Optional[asyncio.Task[None]] = None
        self._stopping = asyncio.Event()
        self._last_refresh_error_message: Optional[str] = None

    async def start(self) -> None:
        try:
            await self.refresh_dashboard()
        except ServiceError as error:
            LOGGER.warning("Initial dashboard refresh failed: %s", error.message)

        self._refresh_task = asyncio.create_task(self._background_refresh_loop())

    async def stop(self) -> None:
        self._stopping.set()
        if self._refresh_task:
            self._refresh_task.cancel()
            try:
                await self._refresh_task
            except asyncio.CancelledError:
                pass

    @property
    def has_dashboard_cache(self) -> bool:
        return self._dashboard_snapshot is not None

    async def get_dashboard(self, *, requested_series: Optional[str], status_filter: Optional[MatchStatus]) -> DashboardPayload:
        snapshot = await self._ensure_dashboard()
        cache_age_seconds = (
            int(max(time.monotonic() - self._dashboard_snapshot_loaded_at, 0))
            if self._dashboard_snapshot_loaded_at is not None
            else 0
        )
        return build_dashboard_payload(
            snapshot,
            requested_series=requested_series,
            default_series_filter=self._settings.default_series_filter,
            status_filter=status_filter,
            is_stale=bool(self._last_refresh_error_message),
            cache_age_seconds=cache_age_seconds,
            refresh_interval_seconds=self._settings.refresh_interval_seconds,
            fallback_message=self._last_refresh_error_message,
        )

    async def get_match_detail(self, match_id: str) -> MatchDetail:
        now = time.monotonic()
        cached = self._detail_cache.get(match_id)
        if cached and cached.expires_at > now:
            return cached.value

        snapshot = await self._ensure_dashboard()
        raw_match = find_match_by_id(snapshot.raw_matches, match_id)

        if raw_match is None:
            snapshot = await self.refresh_dashboard(allow_stale=True)
            raw_match = find_match_by_id(snapshot.raw_matches, match_id)
            if raw_match is None:
                raise ServiceError("match_not_found", "That match could not be found in the live feed.", status_code=404, retryable=False)

        detail_lock = self._detail_locks.setdefault(match_id, asyncio.Lock())

        async with detail_lock:
            cached = self._detail_cache.get(match_id)
            if cached and cached.expires_at > time.monotonic():
                return cached.value

            slug = snapshot.slug_map.get(match_id)
            scorecard_payload = None
            fallback_message = None

            try:
                scorecard_payload = await self._source.fetch_match_scorecard(match_id, slug)
            except ServiceError as error:
                if cached:
                    return cached.value
                fallback_message = error.message

            detail = normalize_match_detail(
                raw_match,
                slug=slug,
                scorecard_payload=scorecard_payload,
                source_fetched_at=snapshot.fetched_at,
                series_media_map=snapshot.series_media_map,
                fallback_error_message=fallback_message,
            )

            ttl_seconds = (
                self._settings.detail_live_ttl_seconds
                if detail.status == MatchStatus.LIVE
                else self._settings.detail_static_ttl_seconds
            )
            self._detail_cache[match_id] = DetailCacheEntry(value=detail, expires_at=time.monotonic() + ttl_seconds)
            return detail

    async def get_media_detail(self, url: str) -> MediaDetail:
        now = time.monotonic()
        cached = self._media_cache.get(url)
        if cached and cached.expires_at > now:
            return cached.value

        media_lock = self._media_locks.setdefault(url, asyncio.Lock())

        async with media_lock:
            cached = self._media_cache.get(url)
            if cached and cached.expires_at > time.monotonic():
                return cached.value

            try:
                media_detail = MediaDetail(**(await self._source.fetch_media_detail(url)))
            except ServiceError:
                if cached:
                    return cached.value
                raise

            self._media_cache[url] = MediaCacheEntry(
                value=media_detail,
                expires_at=time.monotonic() + self._settings.media_ttl_seconds,
            )
            return media_detail

    async def refresh_dashboard(self, *, allow_stale: bool = True) -> DashboardSourceSnapshot:
        async with self._dashboard_lock:
            try:
                snapshot = await self._source.fetch_dashboard_source()
            except ServiceError as error:
                self._last_refresh_error_message = error.message
                if allow_stale and self._dashboard_snapshot is not None and self._has_fresh_enough_stale_snapshot():
                    return self._dashboard_snapshot
                raise

            self._dashboard_snapshot = snapshot
            self._dashboard_snapshot_loaded_at = time.monotonic()
            self._last_refresh_error_message = None
            self._prune_expired_detail_cache()
            return snapshot

    async def _ensure_dashboard(self) -> DashboardSourceSnapshot:
        if self._dashboard_snapshot is not None:
            return self._dashboard_snapshot

        try:
            return await self.refresh_dashboard(allow_stale=False)
        except ServiceError as error:
            raise ServiceError(
                "feed_unavailable",
                error.message or "The live match feed is still warming up.",
                status_code=503,
                retryable=True,
            ) from error

    async def _background_refresh_loop(self) -> None:
        while not self._stopping.is_set():
            try:
                await asyncio.sleep(self._settings.refresh_interval_seconds)
                await self.refresh_dashboard(allow_stale=True)
            except asyncio.CancelledError:
                raise
            except Exception as error:  # pragma: no cover
                LOGGER.exception("Background dashboard refresh failed: %s", error)

    def _prune_expired_detail_cache(self) -> None:
        now = time.monotonic()
        expired = [match_id for match_id, entry in self._detail_cache.items() if entry.expires_at <= now]
        for match_id in expired:
            self._detail_cache.pop(match_id, None)

        expired_media = [url for url, entry in self._media_cache.items() if entry.expires_at <= now]
        for url in expired_media:
            self._media_cache.pop(url, None)

    def _has_fresh_enough_stale_snapshot(self) -> bool:
        if self._dashboard_snapshot_loaded_at is None:
            return False
        age_seconds = time.monotonic() - self._dashboard_snapshot_loaded_at
        return age_seconds <= self._settings.stale_dashboard_ttl_seconds
