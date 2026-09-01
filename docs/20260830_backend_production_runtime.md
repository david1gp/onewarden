# Backend production runtime

The backend deployment is a bundled Bun runtime package. `bun run backend:build`
builds the web vault, bundles `serverStart.ts`, and copies the migrations and
web assets into `dist/`. The package has no runtime `node_modules` install step.

Every package also contains a deterministic `release.json`. It records the
application and package release version, full Git HEAD, exact tag when present,
UTC `builtAt` (the Git HEAD commit time), Bun version, migration schema identity,
artifact format `1`, and sorted SHA-256/size entries for every packaged file
except the manifest itself. Packaging is refused when the checkout is dirty.
Verify a package without deployment checks with `bun run release:verify -- dist`.

## Local operational backups

`bun run backup -- [destination]` creates a timestamped backup directory under
`BACKUP_FOLDER` (default `./data/backups`), or under the supplied destination
root. Each bundle contains a consistent `database.sqlite3` snapshot (including
the live WAL), configured local `sends/` and `attachments/` files, and a
non-secret `manifest.json` with the schema version and SHA-256 entries. Bundle
creation rejects symlinks and path escapes and finalizes with an atomic rename.
S3 attachment objects are not included; back up and restore that bucket or
prefix independently. Predeploy backups cover SQLite and local Sends when S3
attachments are configured. Backups under the managed runtime are excluded
from package replacement.

## Restore

Run `bun run restore -- <backup>` from this checkout. The systemd-aware wrapper
acquires the same deployment lock used by deploy, stops the user service, and
restarts it only when it was active before the restore. It uses the packaged
restore CLI when the managed runtime contains one, otherwise it uses the
checkout's CLI. Restore validates every
manifest entry and hash, rejects symlinks and path traversal, checks SQLite
integrity and schema compatibility, stages the complete database and storage
tree, and then activates it. The previous database, Sends, and attachments are
kept in a timestamped `onewarden-restore-quarantine-*` directory; `.env` is
never moved. A failed activation rolls back when possible while retaining that
quarantine for manual recovery. The built-in restore refuses an S3
`ATTACHMENTS_FOLDER`; restore the matching object-store data independently.

## Attachment storage

Local filesystem storage remains the default:

```dotenv
ATTACHMENTS_FOLDER=./data/attachments
```

Select AWS S3 by setting `ATTACHMENTS_FOLDER` to a bucket and optional prefix.
The AWS SDK resolves the region and credentials through its standard chains,
so set a region (for example `AWS_REGION`) and provide credentials through
environment variables, shared AWS configuration, or an instance/container
role as appropriate. Environment credentials use the standard
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optional `AWS_SESSION_TOKEN`
variables:

```dotenv
ATTACHMENTS_FOLDER=s3://onewarden-attachments/production
AWS_REGION=eu-central-1
```

For an S3-compatible service, set its HTTP(S) endpoint and enable path-style
requests when required by that service. A region is still required by the AWS
SDK; use a value accepted by the provider.

```dotenv
ATTACHMENTS_FOLDER=s3://onewarden-attachments/production
AWS_REGION=us-east-1
S3_ENDPOINT=https://objects.example.com
S3_FORCE_PATH_STYLE=true
```

`S3_ENDPOINT` is optional and must not contain embedded credentials.
`S3_FORCE_PATH_STYLE` defaults to `false`. With the example prefix, encrypted
bytes are stored as
`production/<cipherUuid>/<attachmentId>`; without a prefix, keys are
`<cipherUuid>/<attachmentId>`. Attachment metadata remains in SQLite and
downloads continue through authenticated, short-lived OneWarden URLs.

Changing from a local path to `s3://...` does not migrate existing attachment
files. Copy them separately using the same object-key layout before switching,
or existing attachments will be unavailable.

## Deploy

1. Keep the production environment in the managed runtime's `.env` file. The
    deployment preserves `.env`, `.env.*`, `data/`, and root `onewarden.sqlite*`
    files; the default SQLite database, Send files, attachment files, and icon
    cache therefore survive package replacement. `ATTACHMENTS_FOLDER` defaults
    to `./data/attachments`; relative paths resolve from the runtime working
    directory, as with `SENDS_FOLDER`. Configured attachment folders inside the
    managed runtime are protected during package replacement; absolute folders
    outside it are unaffected. S3 attachment locations are external and are not
    copied, restored, or protected by the deployment tooling.
2. Ensure the default managed runtime directory exists:
   `mkdir -p ~/projects/adaptive/onewarden`.
3. Run `bun run backend:deploy` from this checkout.

Deployment runs a preflight before stopping the service. It validates the
release manifest, migrations, production unit/environment, runtime and storage
paths, and any existing SQLite database, then creates and validates a backup.
The old packaged runtime is retained outside the managed runtime. A failed
restart, readiness check, health/security check, release identity check,
compatibility check, public-origin check, or startup-log check automatically
restores that runtime and unit. Failed runtime artifacts and the predeploy
backup remain available for recovery (the backup stays in its configured backup
folder; failed runtime artifacts are kept under the deployment failure
directory).

The deployment installs `ops/systemd/onewarden.service` as a user unit, enables
it, restarts it, and waits for `http://127.0.0.1:3041/health/ready`. Set
`ONEWARDEN_DEPLOY_DIR`, `ONEWARDEN_BACKEND_PORT`, or `ONEWARDEN_SERVICE` when
using different runtime settings; update the installed unit's paths if the
managed directory is not the default. The postdeploy verifier checks the
external `PUBLIC_ORIGIN` health endpoint but does not configure or reload Caddy.
Release deployment requires `PUBLIC_ORIGIN` to be an HTTPS URL.
Browser/E2E verification remains a separate deferred step.
