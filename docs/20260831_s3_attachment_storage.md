# S3 attachment storage

## Goal

Add optional S3-compatible storage for encrypted attachment bytes, following Vaultwarden's attachment storage model while preserving the existing local attachment backend and API behavior.

## Decisions

- S3 applies only to attachment bytes; attachment metadata remains in SQLite.
- Keep local filesystem storage as the default.
- Treat an `s3://bucket/optional-prefix` `ATTACHMENTS_FOLDER` value as the S3 backend selector, matching Vaultwarden's configuration shape.
- Store objects under `<optional-prefix>/<cipherUuid>/<attachmentId>`.
- Keep downloads behind the existing authenticated, short-lived OneWarden URL rather than exposing direct object-store URLs.
- Use the AWS SDK's standard credential chain and support an explicit endpoint/path-style configuration for S3-compatible services.
- Do not migrate existing local attachments automatically.

## Approach

- Extend validated runtime configuration to recognize S3 attachment locations and optional S3 client settings.
- Implement the existing attachment storage adapter with S3 put/get/delete and paginated prefix cleanup.
- Select the adapter during server startup without changing attachment routes or database schema.
- Cover parsing, adapter behavior, and startup selection with focused tests, then document deployment and migration implications.

## Tasks

- [x] 1. Add and test the S3 attachment configuration contract.
- [x] 2. Add the S3 attachment storage adapter and focused unit tests.
- [x] 3. Wire backend selection into startup and verify attachment flows remain backend-agnostic.
- [x] 4. Document S3-compatible deployment settings and run final verification.
