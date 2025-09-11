#!/usr/bin/env bash
set -euo pipefail

# Pop!_OS / Ubuntu dev prerequisites for VOIDE (offline-first, no remote caching)
# This script installs system deps, validates Node >=20.11, activates pnpm via Corepack,
# and runs workspace checks. It does not enable any cloud features.

need_cmd() { command -v "$1" >/dev/null 2>&1; }
assert_node() {
  if ! need_cmd node; then
    echo "Node.js not found. Install Node >=20.11.x first (tarball or package)."
    exit 1
  fi
  v=$(node -v | sed 's/^v//')
  major=${v%%.*}; rest=${v#*.}; minor=${rest%%.*}
  if [ "$major" -lt 20 ] || { [ "$major" -eq 20 ] && [ "$minor" -lt 11 ]; }; then
    echo "Node $v detected. Require >=20.11.0. Upgrade Node."
    exit 1
  fi
}

echo "[1/6] Installing system packages"
sudo apt-get update
sudo apt-get install -y   git build-essential python3 python-is-python3 pkg-config   libsqlite3-dev   libx11-dev libxkbfile-dev libsecret-1-dev libudev-dev libxss1   libgtk-3-0 libgtk-3-dev libnss3 libasound2   libarchive-tools rpm fakeroot   libfuse2 || true

echo "[2/6] Verifying Node"
assert_node
node -v
npm -v || true

echo "[3/6] Enabling Corepack and pnpm@9"
# Corepack comes with Node 20; this fetches pnpm if online.
# If offline, skip and use the offline script instead.
corepack enable
corepack prepare pnpm@9 --activate
pnpm -v

echo "[4/6] Disable Turborepo telemetry and remote cache (belt-and-suspenders)"
export TURBO_TELEMETRY_DISABLED=1
export TURBO_API=

echo "[5/6] Install workspace deps"
pnpm -w install

echo "[6/6] Build and test"
pnpm -w lint
pnpm -w build
pnpm -w test

cat <<'EON'
OK. Dev environment is ready.

Run dev:
  VOIDE_FREE=1 TURBO_TELEMETRY_DISABLED=1 TURBO_API= pnpm -w run dev

Package for Linux (optional):
  pnpm -w run pack:linux

If native module compile fails, ensure build-essential, python3, and libsqlite3-dev are installed.
EON
