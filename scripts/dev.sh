#!/usr/bin/env bash
set -euo pipefail

# Start Vite dev server in the background
pnpm --filter renderer dev &

# Wait until Vite responds on port 5173
until curl -s http://localhost:5173 > /dev/null; do
  echo "⏳ Waiting for Vite dev server..."
  sleep 1
done

# Start Electron once Vite is ready
VITE_DEV_SERVER_URL=http://localhost:5173 pnpm start

