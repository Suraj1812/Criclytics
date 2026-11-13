# Criclytics

Real cricket match centre with a FastAPI backend, real match scorecards, and stable routing for live, upcoming, and completed matches.

## Highlights

- Real live, upcoming, and completed match feeds from Cricbuzz page data
- Match detail route with batting tables, bowling tables, fall of wickets, partnership notes, and timelines
- Clean error states instead of raw parser failures
- Series filtering and search in the dashboard
- FastAPI backend with normalized `/api/matches` and `/api/match/{id}` responses

## Tech

- Vite
- React
- Tailwind CSS
- FastAPI + HTTPX service for live-feed normalization plus a Vite + React frontend

## Local setup

Requires Node.js 20.19+ and Python 3.9+ on macOS or Linux.

```bash
npm run setup
npm run dev
```

Open **http://localhost:5173**. The dev command starts both Vite and the FastAPI backend (port 8787). Press Ctrl+C to stop both. `npm start` and `npm run dev:all` do the same thing.

Setup installs frontend dependencies, creates an isolated Python `.venv`, installs backend dependencies, and creates `.env.local` if it does not already exist. No virtual environment activation or API key is needed. Run setup again after dependency changes.

All competitions are shown by default. Set the optional filter in `.env.local` if you want to lock the dashboard to a competition like IPL, then restart:

```bash
CRICKET_SERIES_FILTER=indian premier league
```

To run the backend and frontend in separate terminals instead:

```bash
npm run dev:api
npm run dev:web
```

Verify the backend at http://localhost:5173/health (or directly at http://127.0.0.1:8787/health). Match data requires internet access to Cricbuzz; the initial feed can take a moment to load. If either local port is occupied, stop the existing service before restarting.

## Environment variables

```bash
CRICKET_SERIES_FILTER=
CRICKET_REFRESH_SECONDS=5
VITE_MATCH_FEED_POLL_MS=5000
```

Notes:

- No API key is required for the current live-feed adapter.
- `CRICKET_SERIES_FILTER` is optional. Set it to something like `indian premier league` for IPL-only dashboards.
- `CRICKET_REFRESH_SECONDS` controls the background refresh cadence and is clamped between 5 and 30 seconds.
- Live dashboards and live match detail views now poll every 5 seconds in the browser by default, while the FastAPI backend keeps a warm cache on the same cadence.
- The backend reads structured data embedded in the source pages and normalizes it before the UI consumes it.

## Scripts

```bash
npm run dev
npm run setup
npm run dev:web
npm run dev:api
npm run dev:all
npm run build
npm run preview
```

## Railway deploy

The repo now includes a production `Dockerfile` for Railway.

What it does:

- builds the Vite frontend
- serves the built frontend from the FastAPI app
- keeps `/api/*` and `/health` on the same Railway domain

Recommended Railway setup:

```bash
PORT=8787
CRICKET_SERIES_FILTER=
CRICKET_REFRESH_SECONDS=5
```

After redeploy:

- `/health` should return JSON
- `/api/matches` should return JSON
- `/upcoming`, `/live`, `/completed`, `/media`, and `/match/:id` should all load the SPA shell

## API

```bash
GET /api/matches
GET /api/matches?status=live
GET /api/matches?series=all&status=live
GET /api/match/{id}
GET /api/matches/{id}
GET /health
```
