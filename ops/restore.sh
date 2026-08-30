#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
service_name=${ONEWARDEN_SERVICE:-onewarden.service}
runtime_dir=${ONEWARDEN_RESTORE_WORKING_DIR:-${ONEWARDEN_DEPLOY_DIR:-$HOME/projects/adaptive/onewarden}}

fail() {
  printf 'onewarden-restore: %s\n' "$1" >&2
  exit 1
}

[[ $# -eq 1 ]] || fail 'usage: bun run restore -- <backup>'
command -v bun >/dev/null 2>&1 || fail 'bun is required'
command -v flock >/dev/null 2>&1 || fail 'flock is required'
command -v systemctl >/dev/null 2>&1 || fail 'systemctl is required'
[[ -d "$runtime_dir" ]] || runtime_dir=$source_dir
restore_entry="$runtime_dir/tools/backup/restoreCli.js"
if [[ ! -f "$restore_entry" ]]; then
  restore_entry="$source_dir/tools/backup/restoreCli.ts"
fi
[[ -f "$restore_entry" ]] || fail "restore CLI is missing: $restore_entry"

backup_path=$1
if [[ "$backup_path" != /* ]]; then
  backup_path="$PWD/$backup_path"
fi

exec 9>"$source_dir/.onewarden-deploy.lock"
flock -n 9 || fail 'another deployment or restore is already running'

was_active=0
if systemctl --user is-active --quiet "$service_name"; then
  was_active=1
fi
systemctl --user stop "$service_name" >/dev/null 2>&1 || true
if systemctl --user is-active --quiet "$service_name"; then
  fail 'service did not stop'
fi

restore_status=0
(
  cd -- "$runtime_dir"
  bun "$restore_entry" "$backup_path"
) || restore_status=$?

if (( was_active == 1 )); then
  if ! systemctl --user start "$service_name" >/dev/null 2>&1; then
    printf 'onewarden-restore: service could not be restarted\n' >&2
    restore_status=1
  fi
fi

exit "$restore_status"
