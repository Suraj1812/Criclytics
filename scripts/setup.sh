#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

command -v python3 >/dev/null 2>&1 || { echo "Install Python 3.9 or newer first." >&2; exit 1; }
python3 -c 'import sys; assert sys.version_info >= (3, 9), "Python 3.9 or newer is required"'

npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r server/requirements.txt
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi
printf '\nSetup complete. Run npm run dev, then open http://localhost:5173\n'
