#!/bin/sh
set -eu

for port in 8787 5173
do
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
  fi
done

cleanup() {
  kill 0 2>/dev/null || true
}

trap cleanup EXIT INT TERM

python3 -m uvicorn server.app.main:app --reload --host 127.0.0.1 --port 8787 &
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
