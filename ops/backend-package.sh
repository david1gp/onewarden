#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
package_dir=${ONEWARDEN_BACKEND_PACKAGE_DIR:-$source_dir/dist}

fail() {
  printf 'onewarden-package: %s\n' "$1" >&2
  exit 1
}

command -v bun >/dev/null 2>&1 || fail 'bun is required'
command -v cp >/dev/null 2>&1 || fail 'cp is required'
command -v mkdir >/dev/null 2>&1 || fail 'mkdir is required'
command -v rm >/dev/null 2>&1 || fail 'rm is required'
command -v date >/dev/null 2>&1 || fail 'date is required'
command -v tr >/dev/null 2>&1 || fail 'tr is required'

source_dir=$(realpath -- "$source_dir")
mkdir -p -- "$package_dir"
package_dir=$(realpath -- "$package_dir")
[[ "$source_dir" != "$package_dir" ]] || fail 'backend package must not be the source checkout'

release_git_head=''
if [[ -f "$source_dir/.prodctl-sha" && ! -d "$source_dir/.git" ]]; then
  release_git_head=$(tr -d '[:space:]' < "$source_dir/.prodctl-sha")
  [[ "$release_git_head" =~ ^[0-9a-f]{40}$ ]] || fail 'prodctl release has no valid commit identity'
else
  command -v git >/dev/null 2>&1 || fail 'git is required'
  allow_dirty_for_tests=false
  if [[ "${ONEWARDEN_RELEASE_TEST_MODE:-}" == '1' && "${ONEWARDEN_RELEASE_ALLOW_DIRTY_FOR_TESTS:-}" == '1' ]]; then
    allow_dirty_for_tests=true
  fi
  if [[ "$allow_dirty_for_tests" != true ]]; then
    git -C "$source_dir" diff --quiet --exit-code || fail 'backend package requires a clean Git tree'
    [[ -z "$(git -C "$source_dir" status --porcelain=v1 --untracked-files=all)" ]] ||
      fail 'backend package requires a clean Git tree'
  fi
fi

[[ -d "$source_dir/build/web" ]] || fail 'web vault build is missing; run bun run build:vault first'
[[ -d "$source_dir/migrations" ]] || fail 'migrations directory is missing'

rm -rf -- "$package_dir"
mkdir -p -- "$package_dir/server" "$package_dir/tools/backup" "$package_dir/migrations" "$package_dir/build"

bun build "$source_dir/src/server/serverStart.ts" \
  --outfile "$package_dir/server/server.js" \
  --target bun \
  --format esm
bun build "$source_dir/tools/backup/backupCli.ts" \
  --outfile "$package_dir/tools/backup/backupCli.js" \
  --target bun \
  --format esm
bun build "$source_dir/tools/backup/restoreCli.ts" \
  --outfile "$package_dir/tools/backup/restoreCli.js" \
  --target bun \
  --format esm
cp -a "$source_dir/migrations/." "$package_dir/migrations/"
cp -a "$source_dir/build/web" "$package_dir/build/web"
cp "$source_dir/package.json" "$package_dir/package.json"

if [[ -n "$release_git_head" ]]; then
  ONEWARDEN_RELEASE_GIT_HEAD="$release_git_head" \
    ONEWARDEN_RELEASE_BUILT_AT="$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')" \
    bun "$source_dir/tools/release/releaseManifestGenerate.ts" "$package_dir"
else
  ONEWARDEN_RELEASE_GIT_DIRECTORY="$source_dir" bun "$source_dir/tools/release/releaseManifestGenerate.ts" "$package_dir"
fi

printf 'OneWarden backend package: %s\n' "$package_dir"
