#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
target_dir=${ONEWARDEN_DEPLOY_DIR:-$HOME/projects/adaptive/onewarden}
service_name=${ONEWARDEN_SERVICE:-onewarden.service}
port=${ONEWARDEN_BACKEND_PORT:-3041}
package_dir=${ONEWARDEN_BACKEND_PACKAGE_DIR:-$source_dir/dist}
systemd_user_dir=${ONEWARDEN_SYSTEMD_USER_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user}
failure_root=${ONEWARDEN_DEPLOY_FAILURE_DIR:-$(dirname -- "$target_dir")/onewarden-deploy-failures}

fail() {
  printf 'onewarden-deploy: %s\n' "$1" >&2
  exit 1
}

command -v bun >/dev/null 2>&1 || fail 'bun is required'
command -v flock >/dev/null 2>&1 || fail 'flock is required'
command -v rsync >/dev/null 2>&1 || fail 'rsync is required'
command -v systemctl >/dev/null 2>&1 || fail 'systemctl is required'
command -v curl >/dev/null 2>&1 || fail 'curl is required'
command -v install >/dev/null 2>&1 || fail 'install is required'
command -v rm >/dev/null 2>&1 || fail 'rm is required'
command -v sleep >/dev/null 2>&1 || fail 'sleep is required'
command -v date >/dev/null 2>&1 || fail 'date is required'
command -v realpath >/dev/null 2>&1 || fail 'realpath is required'
command -v mktemp >/dev/null 2>&1 || fail 'mktemp is required'
command -v sed >/dev/null 2>&1 || fail 'sed is required'
command -v cp >/dev/null 2>&1 || fail 'cp is required'
command -v journalctl >/dev/null 2>&1 || fail 'journalctl is required'
command -v mkdir >/dev/null 2>&1 || fail 'mkdir is required'

[[ -d "$package_dir" ]] || fail "backend package does not exist: $package_dir (run bun run backend:build)"
[[ -f "$package_dir/release.json" ]] || fail "backend package has no release manifest: $package_dir/release.json"
[[ -f "$source_dir/ops/systemd/onewarden.service" ]] || fail 'user systemd unit is missing'
case "$target_dir" in
  *'|'*|*'&'*|*'\\'*|*'$'*|*'%'*|*$'\t'*|*$'\r'*|*$'\n'*)
    fail 'managed runtime path contains unsafe characters'
    ;;
esac
[[ "$service_name" =~ ^[A-Za-z0-9_.:@-]+\.service$ ]] || fail 'systemd service name contains unsafe characters'

source_dir=$(realpath -- "$source_dir")
target_dir=$(realpath -m -- "$target_dir")
package_dir=$(realpath -- "$package_dir")
failure_root=$(realpath -m -- "$failure_root")
systemd_user_dir=$(realpath -m -- "$systemd_user_dir")
[[ "$source_dir" != "$package_dir" ]] || fail 'backend package must not be the source checkout'
[[ "$source_dir" != "$target_dir" ]] || fail 'deploy checkout must not be the managed runtime checkout'
[[ "$target_dir" != "$package_dir" ]] || fail 'backend package and managed runtime must be different directories'
path_overlaps() {
  [[ "$1" == "$2" || "$1" == "$2"/* || "$2" == "$1"/* ]]
}
path_overlaps "$systemd_user_dir" "$source_dir" && fail 'systemd user unit directory must be outside the source checkout'
path_overlaps "$systemd_user_dir" "$package_dir" && fail 'systemd user unit directory must be outside the release package'
path_overlaps "$systemd_user_dir" "$target_dir" && fail 'systemd user unit directory must be outside the managed runtime'
installed_unit="$systemd_user_dir/$service_name"
[[ "$failure_root" != "$target_dir" && "$failure_root" != "$target_dir"/* ]] ||
  fail 'deployment failure artifacts must be outside the managed runtime'
[[ "$failure_root" != "$package_dir" && "$failure_root" != "$package_dir"/* ]] ||
  fail 'deployment failure artifacts must be outside the release package'
[[ "$failure_root" != "$source_dir" && "$failure_root" != "$source_dir"/* ]] ||
  fail 'deployment failure artifacts must be outside the source checkout'

exec 9>"$source_dir/.onewarden-deploy.lock"
flock -n 9 || fail 'another deployment is already running'

unit_file=$(mktemp)
cleanup_unit() { rm -f -- "$unit_file"; }
trap cleanup_unit EXIT
sed \
  -e "s|^WorkingDirectory=.*|WorkingDirectory=$target_dir|" \
  -e "s|^EnvironmentFile=.*|EnvironmentFile=-$target_dir/.env|" \
  -e "s|^Environment=PORT=.*|Environment=PORT=$port|" \
  "$source_dir/ops/systemd/onewarden.service" > "$unit_file"

printf 'Running predeploy verification.\n'
predeploy_output=$(bun "$source_dir/tools/release/releasePredeployVerify.ts" \
  --package "$package_dir" \
  --runtime "$target_dir" \
  --unit "$unit_file" \
  --port "$port" \
  --source "$source_dir" \
  --installed-unit "$installed_unit")
printf '%s\n' "$predeploy_output"
database_path=""
sends_path=""
attachment_path=""
icon_cache_path=""
backup_storage_path=""
backup_path=""
while IFS= read -r predeploy_line; do
  case "$predeploy_line" in
    PREDEPLOY_DATABASE_PATH=*) database_path=${predeploy_line#PREDEPLOY_DATABASE_PATH=} ;;
    PREDEPLOY_SENDS_PATH=*) sends_path=${predeploy_line#PREDEPLOY_SENDS_PATH=} ;;
    PREDEPLOY_ATTACHMENTS_PATH=*) attachment_path=${predeploy_line#PREDEPLOY_ATTACHMENTS_PATH=} ;;
    PREDEPLOY_ICON_CACHE_PATH=*) icon_cache_path=${predeploy_line#PREDEPLOY_ICON_CACHE_PATH=} ;;
    PREDEPLOY_BACKUP_STORAGE_PATH=*) backup_storage_path=${predeploy_line#PREDEPLOY_BACKUP_STORAGE_PATH=} ;;
    PREDEPLOY_BACKUP=*) backup_path=${predeploy_line#PREDEPLOY_BACKUP=} ;;
  esac
done <<< "$predeploy_output"
[[ -n "$database_path" && -n "$sends_path" && -n "$attachment_path" && -n "$icon_cache_path" && -n "$backup_storage_path" ]] ||
  fail 'predeploy verification returned no protected storage paths'

attachment_exclude=""
if [[ "$attachment_path" == "$target_dir/"* ]]; then
  attachment_relative=${attachment_path#"$target_dir/"}
  attachment_exclude="/${attachment_relative%/}/"
fi
database_exclude=""
if [[ "$database_path" == "$target_dir/"* ]]; then
  database_relative=${database_path#"$target_dir/"}
  database_exclude="/${database_relative%/}"
fi
sends_exclude=""
if [[ "$sends_path" == "$target_dir/"* ]]; then
  sends_relative=${sends_path#"$target_dir/"}
  sends_exclude="/${sends_relative%/}/"
fi
icon_cache_exclude=""
if [[ "$icon_cache_path" == "$target_dir/"* ]]; then
  icon_cache_relative=${icon_cache_path#"$target_dir/"}
  icon_cache_exclude="/${icon_cache_relative%/}/"
fi
backup_storage_exclude=""
if [[ "$backup_storage_path" == "$target_dir/"* ]]; then
  backup_storage_relative=${backup_storage_path#"$target_dir/"}
  backup_storage_exclude="/${backup_storage_relative%/}/"
fi
rsync_options=(
  -a
  --delete
  --exclude '.env'
  --exclude '.env.*'
  --exclude 'data/'
  --exclude 'onewarden.sqlite*'
  --exclude 'onewarden-backup-*'
)
if [[ -n "$attachment_exclude" ]]; then rsync_options+=(--exclude "$attachment_exclude"); fi
if [[ -n "$sends_exclude" ]]; then rsync_options+=(--exclude "$sends_exclude"); fi
if [[ -n "$icon_cache_exclude" ]]; then rsync_options+=(--exclude "$icon_cache_exclude"); fi
if [[ -n "$backup_storage_exclude" ]]; then rsync_options+=(--exclude "$backup_storage_exclude"); fi
if [[ -n "$database_exclude" ]]; then
  rsync_options+=(--exclude "$database_exclude" --exclude "${database_exclude}-*")
fi

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
previous_directory="$failure_root/previous-$timestamp-$$"
failed_directory="$failure_root/failed-$timestamp-$$"
previous_unit_file="$previous_directory.service.unit"
mkdir -p -- "$failure_root" "$failed_directory"
prior_release_exists=0
if [[ -f "$target_dir/release.json" ]]; then prior_release_exists=1; fi

if ! bun "$source_dir/tools/release/releaseRuntimeSnapshotCreate.ts" "$target_dir" "$previous_directory"; then
  fail 'previous packaged runtime could not be preserved'
fi
old_unit_exists=0
if [[ -f "$installed_unit" ]]; then
  cp -- "$installed_unit" "$previous_unit_file"
  old_unit_exists=1
fi
was_active=0
was_enabled=0
if systemctl --user is-active --quiet "$service_name"; then was_active=1; fi
if systemctl --user is-enabled --quiet "$service_name"; then was_enabled=1; fi
restore_previous_unit() {
  if (( old_unit_exists == 1 )); then
    mkdir -p -- "$systemd_user_dir" && cp -- "$previous_unit_file" "$installed_unit"
  else
    rm -f -- "$installed_unit"
  fi
}

deployment_changed=0
rollback_on_exit() {
  status=$?
  trap - EXIT
  if (( deployment_changed == 0 )); then
    cleanup_unit
    exit "$status"
  fi

  printf 'onewarden-deploy: deployment failed; preserving failed artifacts in %s\n' "$failed_directory" >&2
  printf 'exit_status=%s\nprior_release_exists=%s\nprevious_runtime=%s\npredeploy_backup=%s\n' \
    "$status" "$prior_release_exists" "$previous_directory" "$backup_path" > "$failed_directory/rollback.txt" || true
  failed_runtime_directory="$failed_directory/runtime"
  bun "$source_dir/tools/release/releaseRuntimeSnapshotCreate.ts" "$target_dir" "$failed_runtime_directory" >/dev/null 2>&1 ||
    rsync -a --delete "${rsync_options[@]}" "$target_dir/" "$failed_runtime_directory/" >/dev/null 2>&1 || true
  if [[ -f "$installed_unit" ]]; then cp -- "$installed_unit" "$failed_directory/failed.service.unit" || true; fi
  journalctl --user -u "$service_name" -n 200 --no-pager > "$failed_directory/startup.log" 2>&1 || true

  systemctl --user stop "$service_name" >/dev/null 2>&1 || true
  if systemctl --user is-active --quiet "$service_name"; then
    printf 'onewarden-deploy: automatic runtime rollback could not stop the failed service; failed artifacts: %s; predeploy backup: %s\n' \
      "$failed_directory" "${backup_path:-none}" >&2
    exit 1
  fi
  if (( prior_release_exists == 0 )); then
    if ! restore_previous_unit; then
      deployment_changed=0
      cleanup_unit
      printf 'onewarden-deploy: deployment failed with no prior packaged release and the failed unit could not be removed; persistent data was left untouched; failed artifacts: %s; predeploy backup: %s\n' \
        "$failed_directory" "${backup_path:-none}" >&2
      exit 1
    fi
    systemctl --user daemon-reload >/dev/null 2>&1 || true
    if (( old_unit_exists == 1 && was_enabled == 1 )); then
      systemctl --user enable "$service_name" >/dev/null 2>&1 || true
    else
      systemctl --user disable "$service_name" >/dev/null 2>&1 || true
    fi
    deployment_changed=0
    cleanup_unit
    printf 'onewarden-deploy: deployment failed and no prior packaged release exists; persistent data was left untouched; failed artifacts: %s; predeploy backup: %s\n' \
      "$failed_directory" "${backup_path:-none}" >&2
    exit 1
  fi
  if ! bun "$source_dir/tools/release/releaseRuntimeSnapshotRestore.ts" "$previous_directory" "$target_dir"; then
    printf 'onewarden-deploy: automatic runtime rollback failed; failed artifacts: %s; predeploy backup: %s; previous snapshot: %s\n' \
      "$failed_directory" "${backup_path:-none}" "$previous_directory" >&2
    exit 1
  fi
  if ! restore_previous_unit; then
    printf 'onewarden-deploy: automatic runtime rollback restored the package but could not restore the prior systemd unit; failed artifacts: %s; predeploy backup: %s; previous snapshot: %s\n' \
      "$failed_directory" "${backup_path:-none}" "$previous_directory" >&2
    exit 1
  fi
  systemctl --user daemon-reload >/dev/null 2>&1 || true
  rollback_status=0
  if ! systemctl --user enable "$service_name" >/dev/null 2>&1; then rollback_status=1; fi
  if (( rollback_status == 0 )) && ! systemctl --user restart "$service_name" >/dev/null 2>&1; then
    rollback_status=1
  fi
  if (( rollback_status == 0 )); then
    if ! bun "$source_dir/tools/release/releasePostdeployVerify.ts" \
      --package "$previous_directory" \
      --runtime "$target_dir" \
      --service "$service_name" \
      --port "$port" > "$failed_directory/rollback-postdeploy.log" 2>&1; then
      rollback_status=1
    fi
  fi
  if (( was_active == 0 )); then
    if ! systemctl --user stop "$service_name" >/dev/null 2>&1; then rollback_status=1; fi
  fi
  if (( was_enabled == 0 )); then
    if ! systemctl --user disable "$service_name" >/dev/null 2>&1; then rollback_status=1; fi
  fi
  deployment_changed=0
  cleanup_unit
  if (( rollback_status != 0 )); then
    printf 'onewarden-deploy: previous runtime was restored but did not become ready; failed artifacts: %s; predeploy backup: %s; previous snapshot: %s\n' \
      "$failed_directory" "${backup_path:-none}" "$previous_directory" >&2
    exit 1
  fi
  printf 'onewarden-deploy: previous runtime restored and verified; failed artifacts: %s; predeploy backup: %s\n' \
    "$failed_directory" "${backup_path:-none}" >&2
  exit "$status"
}
trap rollback_on_exit EXIT

deployment_changed=1
printf 'Deploying verified OneWarden release to %s.\n' "$target_dir"
if ! systemctl --user stop "$service_name" >/dev/null 2>&1 && systemctl --user is-active --quiet "$service_name"; then
  fail 'production service could not be stopped'
fi
if systemctl --user is-active --quiet "$service_name"; then
  fail 'production service remained active after stop'
fi
rm -rf -- "$target_dir/node_modules"
rsync "${rsync_options[@]}" "$package_dir/" "$target_dir/"

mkdir -p -- "$systemd_user_dir"
install -m 0644 "$unit_file" "$installed_unit"
systemctl --user daemon-reload
systemctl --user enable "$service_name" >/dev/null
systemctl --user restart "$service_name"

printf 'Running postdeploy verification.\n'
bun "$source_dir/tools/release/releasePostdeployVerify.ts" \
  --package "$package_dir" \
  --runtime "$target_dir" \
  --service "$service_name" \
  --port "$port"

deployment_changed=0
printf 'OneWarden backend deployment is healthy. Previous runtime: %s\n' "$previous_directory"
