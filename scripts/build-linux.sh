#!/usr/bin/env bash
set -euo pipefail
pnpm -r build
pnpm pack:linux
