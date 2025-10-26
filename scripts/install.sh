#!/usr/bin/env bash
set -euo pipefail
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install
pnpm -r build
pnpm run native:prepare
echo "OK"
