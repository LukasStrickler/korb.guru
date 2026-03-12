#!/usr/bin/env bash
# Start app backend (API + Convex) in the background, then run Expo in the
# foreground so the terminal stays interactive (Metro prompts, i/a keys, etc.).
# On Ctrl+C, backend processes are stopped.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if docker info >/dev/null 2>&1; then
  pnpm db:ready || true
else
  echo "Docker not running — skipping DB. Run pnpm db:ready when Docker is up."
fi

cleanup() {
  if [[ -n "${TURBO_PID:-}" ]] && kill -0 "$TURBO_PID" 2>/dev/null; then
    echo ""
    echo "Stopping API + Convex (PID $TURBO_PID)..."
    kill "$TURBO_PID" 2>/dev/null || true
    wait "$TURBO_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting API + Convex in the background..."
dotenv -- turbo run dev --filter=@korb/api --filter=@korb/convex &
TURBO_PID=$!

API_PORT="${API_PORT:-8001}"
echo "Waiting for API at http://localhost:${API_PORT}/health ..."
for _ in $(seq 1 90); do
  if curl -sf "http://localhost:${API_PORT}/health" >/dev/null 2>&1; then
    echo "API is up."
    break
  fi
  sleep 1
done

echo ""
echo "Starting Expo (interactive). Press i (iOS) or a (Android), or Shift+I / Shift+A to pick a device. Ctrl+C stops Metro and backend."
echo ""
dotenv -- pnpm --filter @korb/mobile run dev
