# Packaged release identity

`bun run backend:package` writes `dist/release.json` after assembling the Bun
backend package. The manifest contains the package application/version, full Git
HEAD, exact HEAD tag or `null`, deterministic UTC `builtAt`, Bun version, the
highest packaged migration version, artifact format `1`, and sorted file
`path`/`size`/`sha256` entries. `release.json` is excluded from its own entries.

Packaging requires readable Git metadata and a clean worktree. For local fixture
tests only, `ONEWARDEN_RELEASE_TEST_MODE=1 ONEWARDEN_RELEASE_ALLOW_DIRTY_FOR_TESTS=1`
enables the explicit dirty-tree override; deployment does not set either variable.

Run the standalone package verifier with:

```sh
bun run release:verify -- dist
```
