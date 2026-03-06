#!/usr/bin/env bash

set -euo pipefail

VITE_PORT="${VITE_PORT:-5173}"
WRANGLER_PORT="${WRANGLER_PORT:-8794}"

cleanup() {
  trap - EXIT INT TERM

  if [[ -n "${vite_pid:-}" ]]; then
    kill "$vite_pid" 2>/dev/null || true
  fi

  if [[ -n "${wrangler_pid:-}" ]]; then
    kill "$wrangler_pid" 2>/dev/null || true
  fi

  wait "${vite_pid:-}" "${wrangler_pid:-}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "Starting Vite on http://localhost:${VITE_PORT} and Wrangler API on http://localhost:${WRANGLER_PORT}"
echo "Use the Vite URL in your browser for hot reload."

npx vite --host 0.0.0.0 --port "$VITE_PORT" &
vite_pid=$!

npx wrangler dev --local-protocol http --port "$WRANGLER_PORT" --live-reload &
wrangler_pid=$!

first_exit_code=0
while true; do
  if ! kill -0 "$vite_pid" 2>/dev/null; then
    wait "$vite_pid" || first_exit_code=$?
    break
  fi

  if ! kill -0 "$wrangler_pid" 2>/dev/null; then
    wait "$wrangler_pid" || first_exit_code=$?
    break
  fi

  sleep 1
done

exit "$first_exit_code"
