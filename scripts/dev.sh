#!/usr/bin/env bash
set -euo pipefail
pnpm -r dev & sleep 2
VITE_DEV_SERVER_URL=http://localhost:5173 pnpm start
