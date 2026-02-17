#!/bin/sh
set -eu

if [ ! -f /workspace/node_modules/.modules.yaml ]; then
  echo "Installing dependencies with pnpm..."
  (cd /workspace && pnpm install)
fi

exec sh -lc "$*"
