#!/usr/bin/env bash
set -euo pipefail

echo "Running the @adaptive-ds/onewarden deployment preflight."
bun run check

echo "Build and tests complete."
