from __future__ import annotations

import html as html_lib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import quote

import httpx

from ..config import Settings
from ..exceptions import ServiceError


NEXT_CHUNK_PATTERN = re.compile(r'self\.__next_f\.push\(\[1,"((?:\\.|[^"])*)"\]\)', re.S)
LIVE_LINK_PATTERN = re.compile(r"/live-cricket-scores/(\d+)/([^\"?/#]+)")
TITLE_PATTERN = re.compile(r"<title>([^<]+)</title>", re.I)
META_DESCRIPTION_PATTERN = re.compile(r'<meta name="description" content="([^"]+)"', re.I)
OG_TITLE_PATTERN = re.compile(r'<meta property="og:title" content="([^"]+)"', re.I)
OG_IMAGE_PATTERN = re.compile(r'<meta property="og:image" content="([^"]+)"')
JSON_LD_PATTERN = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
NEWS_CARD_PATTERN = re.compile(
    r'<a href="(?P<href>/cricket-news/[^"]+)" title="(?P<title>[^"]+)"><img[^>]+src="(?P<image>https://static\.cricbuzz\.com[^"]+)"[^>]*></a>.*?<p class="[^"]*text-cbTxtSec[^"]*">(?P<summary>[^<]+)</p>',
    re.S,
)
VIDEO_CARD_PATTERN = re.compile(
    r'<a title="(?P<title>[^"]+)" href="(?P<href>/cricket-videos/[^"]+)"[^>]*>.*?<img[^>]+src="(?P<image>https://static\.cricbuzz\.com[^"]+)"[^>]*>.*?<h4[^>]*>(?P<headline>[^<]+)</h4>',
    re.S,
)
NEWS_FEED_ITEM_PATTERN = re.compile(
    r'\{"id":(?P<id>\d+),"imageDetails":\{"imageId":"(?P<image_id>\d+)".*?\},"context":"(?P<context>(?:\\.|[^"])*)","headline":"(?P<headline>(?:\\.|[^"])*)","intro":"(?P<intro>(?:\\.|[^"])*)","publishedTime":"(?P<published>(?:\\.|[^"])*)","storyType":"(?P<story_type>(?:\\.|[^"])*)"',
    re.S,
)


@dataclass(frozen=True)
class DashboardSourceSnapshot:
    fetched_at: str
    raw_matches: list[dict[str, Any]]
    slug_map: dict[str, str]
    series_media_map: dict[str, dict[str, Any]]


class CricbuzzSourceClient:
    def __init__(self, client: httpx.AsyncClient, settings: Settings) -> None:
        self._client = client
        self._settings = settings

    async def fetch_dashboard_source(self) -> DashboardSourceSnapshot:
        html = await self._fetch_text(self._settings.live_scores_url)
        chunks = self._extract_next_chunks(html)
        matches_list = self._extract_json_object_from_chunks(chunks, "matchesList")
        raw_matches = self._collect_dashboard_matches(matches_list)
        series_media_map: dict[str, dict[str, Any]] = {}

        enriched_matches, series_media_map = await self._fetch_series_match_expansions(raw_matches)
        if enriched_matches:
            merged_matches: dict[str, dict[str, Any]] = {}

            for match in enriched_matches:
                match_id = self._match_id_from_payload(match)
                if match_id:
                    merged_matches[match_id] = match

            for match in raw_matches:
                match_id = self._match_id_from_payload(match)
                if match_id:
                    merged_matches[match_id] = match

            raw_matches = list(merged_matches.values())

        if not raw_matches:
            raise ServiceError(
                "empty_response",
                "The live score source returned an empty match list.",
                status_code=502,
                retryable=True,
            )

        slug_map = {match_id: slug for match_id, slug in LIVE_LINK_PATTERN.findall(html)}
        return DashboardSourceSnapshot(
            fetched_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            raw_matches=raw_matches,
            slug_map=slug_map,
            series_media_map=series_media_map,
        )

    async def fetch_match_scorecard(self, match_id: str, slug: Optional[str] = None) -> dict[str, Any]:
        base = f"{self._settings.source_home.rstrip('/')}/live-cricket-scorecard/{quote(match_id)}"
        url = f"{base}/{quote(slug, safe='-')}" if slug else base
        html = await self._fetch_text(url)
        chunks = self._extract_next_chunks(html)
        return self._extract_json_object_from_chunks(chunks, "scorecardApiData")

    async def fetch_media_detail(self, url: str) -> dict[str, Any]:
        validated_url = self._validate_source_url(url)
        html = await self._fetch_text(validated_url)
        kind = "video" if "/cricket-videos/" in validated_url else "photo" if "/cricket-gallery/" in validated_url else "story"
        chunks: list[str] = []

        try:
            chunks = self._extract_next_chunks(html)
        except ServiceError:
            chunks = []

        title = self._extract_meta(html, OG_TITLE_PATTERN, TITLE_PATTERN)
        description = self._extract_meta(html, META_DESCRIPTION_PATTERN)
        image_url = self._extract_meta(html, OG_IMAGE_PATTERN)
        item_id = validated_url.rstrip("/").split("/")[-2] if validated_url.rstrip("/").count("/") >= 2 else validated_url
        stream_url = None
        gallery_images: list[dict[str, Any]] = []
        published_label = None

        if kind == "video" and chunks:
            stream_url = self._extract_string_field_from_chunks(chunks, "videoUrl")
        elif kind == "photo":
            gallery_images, gallery_title, published_label = self._extract_gallery_images_from_json_ld(html)
            if gallery_title:
                title = gallery_title
            if gallery_images:
                image_url = image_url or gallery_images[0]["imageUrl"]
                description = description or gallery_images[0].get("caption") or f"{len(gallery_images)} gallery frames."

        return {
            "id": item_id,
            "kind": kind,
            "title": self._clean_page_title(title) or ("Photo gallery" if kind == "photo" else "Media preview"),
            "href": validated_url,
            "imageUrl": image_url,
            "summary": description,
            "contextLabel": "Photo gallery" if kind == "photo" else "Studio video" if kind == "video" else "Editorial story",
            "publishedLabel": published_label,
            "sourceLabel": "Photo gallery" if kind == "photo" else "Live series media",
            "streamUrl": stream_url,
            "galleryImages": gallery_images,
        }

    async def _fetch_series_match_expansions(self, raw_matches: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
        series_targets: dict[str, str] = {}

        for match in raw_matches:
            match_info = self._as_dict(match.get("matchInfo"))
            series_id = self._first_text(match_info.get("seriesId"))
            series_name = self._first_text(match_info.get("seriesName"))
            if series_id and series_name:
                series_targets[series_id] = series_name

        expanded_matches: dict[str, dict[str, Any]] = {}
        series_media_map: dict[str, dict[str, Any]] = {}
        global_story_items = await self._safe_fetch_global_story_items()
        global_video_items = await self._safe_fetch_global_video_items()
        global_photo_items = await self._safe_fetch_global_photo_items()

        for series_id, series_name in series_targets.items():
            try:
                payload = await self._fetch_series_matches_payload(series_id, series_name)
            except ServiceError:
                continue

            media_payload = await self._fetch_series_media_payload(
                series_id,
                series_name,
                global_story_items=global_story_items,
                global_video_items=global_video_items,
                global_photo_items=global_photo_items,
            )
            if media_payload:
                series_media_map[series_id] = media_payload

            for match in self._collect_dashboard_matches(payload):
                match_id = self._match_id_from_payload(match)
                if match_id and match_id not in expanded_matches:
                    expanded_matches[match_id] = match

        return list(expanded_matches.values()), series_media_map

    async def _fetch_series_matches_payload(self, series_id: str, series_name: str) -> dict[str, Any]:
        series_slug = self._slugify(series_name)
        url = f"{self._settings.source_home.rstrip('/')}/cricket-series/{quote(series_id)}/{quote(series_slug, safe='-')}/matches"
        html = await self._fetch_text(url)
        chunks = self._extract_next_chunks(html)
        return self._extract_json_object_from_chunks(chunks, "matchesData")

    async def _fetch_series_media_payload(
        self,
        series_id: str,
        series_name: str,
        *,
        global_story_items: list[dict[str, Any]],
        global_video_items: list[dict[str, Any]],
        global_photo_items: list[dict[str, Any]],
    ) -> Optional[dict[str, Any]]:
        series_slug = self._slugify(series_name)
        url = f"{self._settings.source_home.rstrip('/')}/cricket-series/{quote(series_id)}/{quote(series_slug, safe='-')}"

        try:
            html = await self._fetch_text(url)
        except ServiceError:
            return None

        stories = self._merge_media_items(self._extract_media_items(html, NEWS_CARD_PATTERN, kind="story"), global_story_items, limit=24)
        videos = self._merge_media_items(self._extract_media_items(html, VIDEO_CARD_PATTERN, kind="video"), global_video_items, limit=36)
        photos = global_photo_items[:24]

        if not stories and not videos and not photos:
            return None

        cover_match = OG_IMAGE_PATTERN.search(html)
        cover_image_url = html_lib.unescape(cover_match.group(1)) if cover_match else None

        return {
            "seriesId": series_id,
            "seriesName": series_name,
            "seriesUrl": url,
            "coverImageUrl": cover_image_url,
            "stories": stories,
            "videos": videos,
            "photos": photos,
            "photosUrl": f"{self._settings.source_home.rstrip('/')}/cricket-photo-gallery",
        }

    async def _safe_fetch_global_story_items(self) -> list[dict[str, Any]]:
        try:
            return await self._fetch_global_story_items()
        except ServiceError:
            return []

    async def _safe_fetch_global_video_items(self) -> list[dict[str, Any]]:
        try:
            return await self._fetch_global_video_items()
        except ServiceError:
            return []

    async def _safe_fetch_global_photo_items(self) -> list[dict[str, Any]]:
        try:
            return await self._fetch_global_photo_items()
        except ServiceError:
            return []

    async def _fetch_global_story_items(self) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []

        for path in ("/cricket-news", "/cricket-news/latest-news"):
            html = await self._fetch_text(f"{self._settings.source_home.rstrip('/')}{path}")
            merged = self._merge_media_items(
                merged,
                [*self._extract_structured_story_items(html), *self._extract_media_items(html, NEWS_CARD_PATTERN, kind="story")],
                limit=30,
            )

        return merged

    async def _fetch_global_video_items(self) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []

        for path in ("/cricket-videos", "/cricket-videos/categories"):
            html = await self._fetch_text(f"{self._settings.source_home.rstrip('/')}{path}")
            merged = self._merge_media_items(merged, self._extract_media_items(html, VIDEO_CARD_PATTERN, kind="video"), limit=40)

        return merged

    async def _fetch_global_photo_items(self) -> list[dict[str, Any]]:
        html = await self._fetch_text(f"{self._settings.source_home.rstrip('/')}/cricket-photo-gallery")
        chunks = self._extract_next_chunks(html)
        photos_payload = self._extract_json_value_from_chunks(chunks, "photosData")
        return self._extract_photo_gallery_items(photos_payload)[:24]

    async def _fetch_text(self, url: str) -> str:
        try:
            response = await self._client.get(
                url,
                headers={
                    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache",
                },
            )
        except httpx.TimeoutException as error:
            raise ServiceError(
                "upstream_timeout",
                "The live cricket source timed out while refreshing.",
                status_code=504,
                retryable=True,
            ) from error
        except httpx.HTTPError as error:
            raise ServiceError(
                "upstream_failure",
                "Unable to reach the live cricket source right now.",
                status_code=502,
                retryable=True,
            ) from error

        if response.status_code == 404:
            raise ServiceError(
                "not_found",
                "The live source does not have a scorecard for this match yet.",
                status_code=404,
                retryable=False,
            )

        if response.status_code in (429, 500, 502, 503, 504):
            raise ServiceError(
                "upstream_failure",
                "The live cricket source is temporarily unavailable.",
                status_code=502,
                retryable=True,
            )

        if response.status_code >= 400:
            raise ServiceError(
                "upstream_failure",
                "The live cricket source rejected the request.",
                status_code=502,
                retryable=True,
            )

        if not response.text.strip():
            raise ServiceError(
                "empty_response",
                "The live cricket source returned an empty response.",
                status_code=502,
                retryable=True,
            )

        return response.text

    def _extract_next_chunks(self, html: str) -> list[str]:
        chunks: list[str] = []

        for raw_chunk in NEXT_CHUNK_PATTERN.findall(html):
            try:
                chunks.append(json.loads(f'"{raw_chunk}"'))
            except json.JSONDecodeError:
                continue

        if not chunks:
            raise ServiceError(
                "parse_error",
                "The live score page format changed and could not be decoded.",
                status_code=502,
                retryable=True,
            )

        return chunks

    def _extract_json_object_from_chunks(self, chunks: list[str], token: str) -> dict[str, Any]:
        quoted_token = f'"{token}":'

        for chunk in chunks:
            if quoted_token not in chunk:
                continue
            return self._extract_json_object(chunk, quoted_token)

        raise ServiceError(
            "parse_error",
            "The live score source did not expose the expected structured data.",
            status_code=502,
            retryable=True,
        )

    def _extract_json_value_from_chunks(self, chunks: list[str], token: str) -> Any:
        quoted_token = f'"{token}":'

        for chunk in chunks:
            token_index = chunk.find(quoted_token)
            if token_index == -1:
                continue

            return self._extract_json_value(chunk, token_index + len(quoted_token))

        raise ServiceError(
            "parse_error",
            "The media source did not expose the expected structured data.",
            status_code=502,
            retryable=True,
        )

    def _extract_string_field_from_chunks(self, chunks: list[str], token: str) -> Optional[str]:
        quoted_token = f'"{token}":"'

        for chunk in chunks:
            token_index = chunk.find(quoted_token)
            if token_index == -1:
                continue

            index = token_index + len(quoted_token)
            characters: list[str] = []
            escaping = False

            while index < len(chunk):
                char = chunk[index]
                if escaping:
                    characters.append(char)
                    escaping = False
                elif char == "\\":
                    escaping = True
                elif char == '"':
                    return "".join(characters).replace("\\u0026", "&")
                else:
                    characters.append(char)
                index += 1

        return None

    def _extract_json_object(self, text: str, token: str) -> dict[str, Any]:
        token_index = text.find(token)

        if token_index == -1:
            raise ServiceError(
                "parse_error",
                "The structured data token could not be found.",
                status_code=502,
                retryable=True,
            )

        start_index = text.find("{", token_index)

        if start_index == -1:
            raise ServiceError(
                "parse_error",
                "The structured data object could not be located.",
                status_code=502,
                retryable=True,
            )

        depth = 0
        in_string = False
        escaping = False

        for index in range(start_index, len(text)):
            char = text[index]

            if in_string:
                if escaping:
                    escaping = False
                elif char == "\\":
                    escaping = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
                continue

            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    raw_json = text[start_index : index + 1]
                    try:
                        return json.loads(raw_json)
                    except json.JSONDecodeError as error:
                        raise ServiceError(
                            "parse_error",
                            "The live source returned malformed structured data.",
                            status_code=502,
                            retryable=True,
                        ) from error

        raise ServiceError(
            "parse_error",
            "The structured data object was incomplete.",
            status_code=502,
            retryable=True,
        )

    def _extract_json_value(self, text: str, start_index: int) -> Any:
        index = start_index

        while index < len(text) and text[index].isspace():
            index += 1

        if index >= len(text):
            raise ServiceError(
                "parse_error",
                "The structured data value could not be located.",
                status_code=502,
                retryable=True,
            )

        opener = text[index]

        if opener not in "{[":
            end_index = index
            while end_index < len(text) and text[end_index] not in ",}]":
                end_index += 1
            raw_value = text[index:end_index].strip()
            try:
                return json.loads(raw_value)
            except json.JSONDecodeError as error:
                raise ServiceError(
                    "parse_error",
                    "The structured data value was malformed.",
                    status_code=502,
                    retryable=True,
                ) from error

        closer = "}" if opener == "{" else "]"
        depth = 0
        in_string = False
        escaping = False

        for end_index in range(index, len(text)):
            char = text[end_index]

            if in_string:
                if escaping:
                    escaping = False
                elif char == "\\":
                    escaping = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
                continue

            if char == opener:
                depth += 1
            elif char == closer:
                depth -= 1
                if depth == 0:
                    raw_value = text[index : end_index + 1]
                    try:
                        return json.loads(raw_value)
                    except json.JSONDecodeError as error:
                        raise ServiceError(
                            "parse_error",
                            "The structured data value was malformed.",
                            status_code=502,
                            retryable=True,
                        ) from error

        raise ServiceError(
            "parse_error",
            "The structured data value was incomplete.",
            status_code=502,
            retryable=True,
        )

    def _collect_dashboard_matches(self, payload: Any) -> list[dict[str, Any]]:
        matches: dict[str, dict[str, Any]] = {}
        stack = [payload]

        while stack:
            current = stack.pop()

            if isinstance(current, list):
                stack.extend(current)
                continue

            if not isinstance(current, dict):
                continue

            match_info = current.get("matchInfo")

            if isinstance(match_info, dict):
                match_id = self._first_text(match_info.get("matchId"), current.get("matchId"))
                if match_id:
                    matches[match_id] = current

            stack.extend(current.values())

        return list(matches.values())

    def _extract_media_items(self, html: str, pattern: re.Pattern[str], *, kind: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen: set[str] = set()

        for match in pattern.finditer(html):
            href = html_lib.unescape(match.group("href")).strip()
            title = html_lib.unescape(match.group("title")).strip()
            image_url = html_lib.unescape(match.group("image")).strip()
            summary = html_lib.unescape((match.groupdict().get("summary") or "").strip()) or None

            if not href or not title or href in seen:
                continue

            seen.add(href)
            items.append(
                {
                    "id": href.rstrip("/").split("/")[-2] if href.rstrip("/").count("/") >= 2 else href,
                    "kind": kind,
                    "title": title,
                    "href": f"{self._settings.source_home.rstrip('/')}{href}",
                    "imageUrl": image_url,
                    "summary": summary,
                    "contextLabel": "Studio video" if kind == "video" else "Editorial story",
                    "publishedLabel": None,
                    "durationLabel": None,
                }
            )

        return items

    def _extract_structured_story_items(self, html: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen: set[str] = set()

        for match in NEWS_FEED_ITEM_PATTERN.finditer(html):
            story_id = match.group("id")
            title = self._decode_json_string(match.group("headline"))
            summary = self._decode_json_string(match.group("intro")) or None
            context_label = self._decode_json_string(match.group("context")) or self._decode_json_string(match.group("story_type")) or "Latest story"
            published_label = self._decode_json_string(match.group("published")) or None
            image_id = match.group("image_id")
            href = f"{self._settings.source_home.rstrip('/')}/cricket-news/{story_id}/{quote(self._slugify(title), safe='-')}"

            if not story_id or not title or href in seen:
                continue

            seen.add(href)
            items.append(
                {
                    "id": story_id,
                    "kind": "story",
                    "title": title,
                    "href": href,
                    "imageUrl": self._build_static_image_url(image_id, title, size="600x338"),
                    "summary": summary,
                    "contextLabel": context_label,
                    "publishedLabel": published_label,
                    "durationLabel": None,
                }
            )

        return items

    def _extract_photo_gallery_items(self, payload: Any) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen: set[str] = set()

        for entry in payload if isinstance(payload, list) else []:
            gallery_info = self._as_dict(self._as_dict(entry).get("photoGalleryInfo"))
            gallery_id = self._first_text(gallery_info.get("galleryId"))
            title = self._first_text(gallery_info.get("headline"))
            image_id = self._first_text(gallery_info.get("imageId"))
            href = f"{self._settings.source_home.rstrip('/')}/cricket-gallery/{gallery_id}/{quote(self._slugify(title), safe='-')}"

            if not gallery_id or not title or href in seen:
                continue

            seen.add(href)
            items.append(
                {
                    "id": gallery_id,
                    "kind": "photo",
                    "title": title,
                    "href": href,
                    "imageUrl": self._build_static_image_url(image_id, title, size="600x338"),
                    "summary": "Open the gallery workspace to browse every frame in this photo set.",
                    "contextLabel": "Photo gallery",
                    "publishedLabel": self._format_timestamp_label(gallery_info.get("publishedTime")),
                    "durationLabel": None,
                }
            )

        return items

    def _extract_gallery_images_from_json_ld(self, html: str) -> tuple[list[dict[str, Any]], Optional[str], Optional[str]]:
        images: list[dict[str, Any]] = []
        seen: set[str] = set()
        headline = None
        published_label = None

        for raw_payload in JSON_LD_PATTERN.findall(html):
            for payload in self._iterate_json_ld_payloads(raw_payload):
                if self._first_text(payload.get("@type")) != "ImageObject":
                    continue

                image_url = self._first_text(payload.get("image"))
                if not image_url or image_url in seen:
                    continue

                seen.add(image_url)
                headline = headline or self._first_text(payload.get("headline")) or None
                published_label = published_label or self._format_date_label(self._first_text(payload.get("datePublished")))
                images.append(
                    {
                        "id": str(len(images) + 1),
                        "imageUrl": image_url,
                        "caption": self._first_text(payload.get("caption")) or None,
                        "altText": self._first_text(payload.get("headline")) or None,
                    }
                )

        return images, headline, published_label

    def _iterate_json_ld_payloads(self, raw_payload: str) -> list[dict[str, Any]]:
        try:
            parsed = json.loads(html_lib.unescape(raw_payload))
        except json.JSONDecodeError:
            return []

        if isinstance(parsed, list):
            return [item for item in parsed if isinstance(item, dict)]
        if isinstance(parsed, dict):
            return [parsed]
        return []

    @staticmethod
    def _merge_media_items(primary: list[dict[str, Any]], secondary: list[dict[str, Any]], *, limit: int) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []
        seen: set[str] = set()

        for item in [*primary, *secondary]:
            href = str(item.get("href") or "")
            if not href or href in seen:
                continue
            seen.add(href)
            merged.append(item)
            if len(merged) >= limit:
                break

        return merged

    def _extract_meta(self, html: str, *patterns: re.Pattern[str]) -> Optional[str]:
        for pattern in patterns:
            match = pattern.search(html)
            if match:
                return html_lib.unescape(match.group(1)).strip()
        return None

    def _validate_source_url(self, url: str) -> str:
        source_root = self._settings.source_home.rstrip("/")
        if not url.startswith(source_root):
            raise ServiceError("invalid_media_url", "That media item does not belong to the configured source.", status_code=400, retryable=False)
        return url

    @staticmethod
    def _clean_page_title(value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        cleaned = value.replace("| Cricbuzz.com | Cricbuzz.com", "").replace("| Cricbuzz.com", "").strip()
        return cleaned or None

    @staticmethod
    def _decode_json_string(value: Optional[str]) -> str:
        if not value:
            return ""

        try:
            return json.loads(f'"{value}"').strip()
        except json.JSONDecodeError:
            return html_lib.unescape(value).strip()

    @staticmethod
    def _build_static_image_url(image_id: str, title: str, *, size: str) -> Optional[str]:
        if not image_id:
            return None
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "media"
        return f"https://static.cricbuzz.com/a/img/v1/{size}/i1/c{image_id}/{quote(slug, safe='-')}.jpg"

    @staticmethod
    def _format_timestamp_label(value: Any) -> Optional[str]:
        raw = CricbuzzSourceClient._first_text(value)
        if not raw:
            return None

        try:
            timestamp = int(raw) / 1000
        except ValueError:
            return None

        return datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%a, %b %-d, %Y")

    @staticmethod
    def _format_date_label(value: str) -> Optional[str]:
        if not value:
            return None

        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

        return parsed.strftime("%a, %b %-d, %Y")

    def _match_id_from_payload(self, payload: dict[str, Any]) -> str:
        match_info = self._as_dict(payload.get("matchInfo"))
        return self._first_text(match_info.get("matchId"), payload.get("matchId"))

    @staticmethod
    def _as_dict(value: Any) -> dict[str, Any]:
        return value if isinstance(value, dict) else {}

    @staticmethod
    def _slugify(value: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", value.lower())
        return slug.strip("-") or "series"

    @staticmethod
    def _first_text(*values: Any) -> str:
        for value in values:
            if value is None:
                continue
            if isinstance(value, str):
                cleaned = " ".join(value.replace("\xa0", " ").split())
                if cleaned:
                    return cleaned
            elif isinstance(value, (int, float)):
                return str(value)
        return ""
