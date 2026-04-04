from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from .config import load_settings
from .exceptions import ServiceError
from .models import ApiErrorPayload, DashboardPayload, MatchDetail, MatchStatus, MediaDetail
from .store import MatchStore
from .sources.cricbuzz import CricbuzzSourceClient


logging.basicConfig(level=logging.INFO)


def load_env_file(path: Path, *, overwrite: bool = False) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if overwrite or key not in os.environ:
            os.environ[key] = value


load_env_file(Path.cwd() / ".env")
load_env_file(Path.cwd() / ".env.local", overwrite=True)
SETTINGS = load_settings()
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DIST_DIR = PROJECT_ROOT / "dist"
FRONTEND_ENTRY = DIST_DIR / "index.html"


@asynccontextmanager
async def lifespan(app: FastAPI):
    transport = httpx.AsyncHTTPTransport(retries=1)
    async with httpx.AsyncClient(
        timeout=SETTINGS.request_timeout_seconds,
        follow_redirects=True,
        headers={"User-Agent": SETTINGS.user_agent},
        transport=transport,
    ) as client:
        source = CricbuzzSourceClient(client, SETTINGS)
        store = MatchStore(source, SETTINGS)
        app.state.store = store
        app.state.settings = SETTINGS
        await store.start()
        try:
            yield
        finally:
            await store.stop()


app = FastAPI(title="Criclytics Cricket API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def disable_cache_for_dynamic_endpoints(request: Request, call_next):
    response = await call_next(request)

    if request.url.path == "/health" or request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    return response


@app.exception_handler(ServiceError)
async def service_error_handler(_: Request, error: ServiceError) -> JSONResponse:
    payload = ApiErrorPayload(
        error={
            "code": error.code,
            "message": error.message,
            "retryable": error.retryable,
        }
    )
    return JSONResponse(status_code=error.status_code, content=payload.model_dump())


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, error: Exception) -> JSONResponse:
    logging.getLogger(__name__).exception("Unhandled backend error: %s", error)
    payload = ApiErrorPayload(
        error={
            "code": "unexpected_error",
            "message": "The cricket data service hit an unexpected error. Please try again shortly.",
            "retryable": True,
        }
    )
    return JSONResponse(status_code=500, content=payload.model_dump())


@app.get("/health")
async def health(request: Request) -> dict[str, object]:
    store: MatchStore = request.app.state.store
    return {
        "ok": True,
        "provider": "Criclytics Match Engine",
        "hasDashboardCache": store.has_dashboard_cache,
        "refreshIntervalSeconds": request.app.state.settings.refresh_interval_seconds,
    }


@app.get("/api/matches", response_model=DashboardPayload)
async def get_matches(
    request: Request,
    status: Optional[MatchStatus] = Query(default=None),
    series: Optional[str] = Query(default=None),
) -> DashboardPayload:
    store: MatchStore = request.app.state.store
    return await store.get_dashboard(requested_series=series, status_filter=status)


@app.get("/api/match/{match_id}", response_model=MatchDetail)
@app.get("/api/matches/{match_id}", response_model=MatchDetail)
async def get_match_detail(match_id: str, request: Request) -> MatchDetail:
    if not match_id.strip():
        raise ServiceError("invalid_match_id", "A valid match id is required.", status_code=400, retryable=False)
    store: MatchStore = request.app.state.store
    return await store.get_match_detail(match_id.strip())


@app.get("/api/media/resolve", response_model=MediaDetail)
async def resolve_media(request: Request, url: str = Query(..., min_length=1)) -> MediaDetail:
    store: MatchStore = request.app.state.store
    return await store.get_media_detail(url.strip())


def _serve_frontend_entry() -> FileResponse:
    if not FRONTEND_ENTRY.exists():
        raise HTTPException(status_code=503, detail="Frontend bundle is not available on this deployment.")

    return FileResponse(FRONTEND_ENTRY)


@app.get("/", include_in_schema=False)
async def serve_frontend_root() -> FileResponse:
    return _serve_frontend_entry()


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend_path(full_path: str) -> FileResponse:
    if full_path.startswith(("api/", "health")):
        raise HTTPException(status_code=404, detail="Not found")

    asset_path = (DIST_DIR / full_path).resolve()
    if DIST_DIR.exists() and str(asset_path).startswith(str(DIST_DIR.resolve())) and asset_path.is_file():
        return FileResponse(asset_path)

    if "." in Path(full_path).name or full_path.startswith("assets/"):
        raise HTTPException(status_code=404, detail="Not found")

    return _serve_frontend_entry()
