#!/usr/bin/env bash
set -euo pipefail

echo "Starting Vite dev server in the background..."
# Start the dev server for all packages and send it to the background
pnpm -r dev &

echo "Waiting for Vite server on port 5173..."
# Use wait-on instead of sleep. npx runs it without a global install.
npx wait-on tcp:5173 --timeout 60000

echo "Vite server is ready! Starting Electron..."
VITE_DEV_SERVER_URL=http://localhost:5173 pnpm start
