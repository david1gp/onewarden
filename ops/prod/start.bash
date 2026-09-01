#!/usr/bin/env bash
set -euo pipefail

: "${PRODCTL_PORT_DEFAULT:?prodctl did not provide the default port}"
runtime_directory="$HOME/.local/share/onewarden"

export PORT="$PRODCTL_PORT_DEFAULT"
export DATABASE_PATH="${DATABASE_PATH:-$runtime_directory/onewarden.sqlite3}"
export SENDS_FOLDER="${SENDS_FOLDER:-$runtime_directory/sends}"
export ATTACHMENTS_FOLDER="${ATTACHMENTS_FOLDER:-$runtime_directory/attachments}"
export BACKUP_FOLDER="${BACKUP_FOLDER:-$runtime_directory/backups}"
export ICON_CACHE_FOLDER="${ICON_CACHE_FOLDER:-$runtime_directory/icon_cache}"
export WEB_VAULT_FOLDER="${WEB_VAULT_FOLDER:-$HOME/current/dist/build/web}"

install -d -m 700 "$runtime_directory"
exec /usr/bin/env bun "$HOME/current/dist/server/server.js"
