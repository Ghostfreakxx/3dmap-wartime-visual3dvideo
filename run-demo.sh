#!/usr/bin/env bash
# Build and start GhostView in simulated mode (no hardware needed).
# Usage: ./run-demo.sh [http-port]     (default 3000)
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-3000}"

command -v cargo >/dev/null || { echo "Rust is required: https://rustup.rs" >&2; exit 1; }

echo "==> Fetching submodules"
git submodule update --init --depth 1

echo "==> Building the sensing server (first build takes several minutes)"
(cd v2 && cargo build --release -p wifi-densepose-sensing-server)

# The server protects /api/v1/* with a bearer token. Reuse yours if set.
if [ -z "${RUVIEW_API_TOKEN:-}" ]; then
  RUVIEW_API_TOKEN="$(openssl rand -hex 32)"
fi
export RUVIEW_API_TOKEN

cat <<MSG

GhostView is starting with simulated data.

  Dashboard:    http://localhost:${PORT}/ui/index.html
  3D view:      http://localhost:${PORT}/ui/observatory.html
  API token:    ${RUVIEW_API_TOKEN}

Paste the API token into the settings (gear) panel of the dashboard once;
the browser remembers it. Press Ctrl+C to stop.

MSG

cd v2
exec ./target/release/sensing-server --source simulate \
  --http-port "${PORT}" --ws-port "$((PORT + 1))" --ui-path ../ui
