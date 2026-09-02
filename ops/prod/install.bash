#!/usr/bin/env bash
set -euo pipefail

ports_file="$HOME/.config/onewarden/prodctl-ports.env"
environment_file="$HOME/.config/onewarden/.env.production"
bun_path="$HOME/.bun/bin/bun"

export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"

if [[ ! -x "$bun_path" ]]; then
	command -v curl >/dev/null 2>&1 || {
		printf 'onewarden install: bun is required and curl is unavailable\n' >&2
		exit 1
	}
	curl -fsSL https://bun.sh/install | bash -s -- bun-v1.4.0
fi
[[ -x "$bun_path" ]] || {
	printf 'onewarden install: Bun installation did not provide %s\n' "$bun_path" >&2
	exit 1
}
command -v stat >/dev/null 2>&1 || {
	printf 'onewarden install: stat is required\n' >&2
	exit 1
}

[[ -f "$ports_file" && ! -L "$ports_file" ]] || {
	printf 'onewarden install: missing prodctl port file: %s\n' "$ports_file" >&2
	exit 1
}
# shellcheck disable=SC1090
source "$ports_file"
: "${PRODCTL_PORT_DEFAULT:?prodctl did not provide the default port}"

[[ -f "$environment_file" && ! -L "$environment_file" ]] || {
	printf 'onewarden install: missing protected environment file: %s\n' "$environment_file" >&2
	exit 1
}
[[ "$(stat -c '%a' "$environment_file")" == 600 ]] || {
	printf 'onewarden install: environment file must have mode 600: %s\n' "$environment_file" >&2
	exit 1
}

install -d -m 700 "$HOME/.local/share/onewarden"

# prodctl deploys a source archive. Build the bundled runtime package in the
# release so the service does not depend on release-local node_modules.
"$bun_path" install --ignore-scripts --os=linux --cpu=x64
"$bun_path" ./node_modules/vite/bin/vite.js build --config vite.web.config.ts
"$bun_path" run backend:package
