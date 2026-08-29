#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
target_dir=${ONEWARDEN_DEPLOY_DIR:-$HOME/projects/adaptive/onewarden}
service_name=${ONEWARDEN_SERVICE:-onewarden.service}
port=${ONEWARDEN_BACKEND_PORT:-3041}

fail() {
  printf 'onewarden-deploy: %s\n' "$1" >&2
  exit 1
}

command -v flock >/dev/null 2>&1 || fail 'flock is required'
command -v rsync >/dev/null 2>&1 || fail 'rsync is required'
command -v systemctl >/dev/null 2>&1 || fail 'systemctl is required'
command -v curl >/dev/null 2>&1 || fail 'curl is required'

[[ -d "$target_dir" ]] || fail "managed checkout does not exist: $target_dir"
source_dir=$(realpath -- "$source_dir")
target_dir=$(realpath -- "$target_dir")
[[ "$source_dir" != "$target_dir" ]] || fail 'deploy checkout must not be the managed runtime checkout'

exec 9>"$source_dir/.onewarden-deploy.lock"
flock -n 9 || fail 'another deployment is already running'

printf 'Syncing OneWarden backend to %s.\n' "$target_dir"
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'node_modules/' \
  --exclude 'build/' \
  --exclude 'dist/' \
  --exclude 'data/' \
  --exclude 'onewarden.sqlite*' \
  "$source_dir/" "$target_dir/"

(
  cd "$target_dir"
  bun install --frozen-lockfile --ignore-scripts
)

systemctl --user restart "$service_name"

deadline=$((SECONDS + ${ONEWARDEN_DEPLOY_TIMEOUT_SECONDS:-30}))
while (( SECONDS < deadline )); do
  if curl --fail --silent --show-error --max-time 3 "http://127.0.0.1:${port}/health" >/dev/null; then
    printf 'OneWarden backend is ready.\n'
    exit 0
  fi
  sleep 1
done

fail "backend did not become ready on port ${port}"
