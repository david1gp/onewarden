# OneWarden production deployment

## Goal

Deploy the current OneWarden release at `https://onewarden.contentoren.de` through `~/leo/contentoren-server` and its specialized `prodctl`, store production configuration in a protected `.env.production`, use a dedicated Cloudflare R2 bucket for attachments, configure Zitadel OIDC, and verify login with `ssotest`.

## Decisions

- Use a bare `prodctl` application named `onewarden` with a dynamically allocated loopback port and Cloudflare Tunnel route.
- Keep deployable service metadata in `ops/prod`; the service reads `%h/.config/onewarden/.env.production` and `prodctl-ports.env`.
- Keep the complete production environment in the app-owned `.env.production` with mode `0600`; never commit secrets.
- Use R2 bucket `contentoren-onewarden`, token `r2-onewarden`, region `auto`, and attachment prefix `production`.
- Use Zitadel authority `https://auth.contentoren.de`, a dedicated confidential Web OIDC client, and redirect URI `https://onewarden.contentoren.de/identity/connect/oidc-signin`.
- Enable SSO while retaining password login during initial validation (`SSO_ONLY=false`).

## Approach

- Add the smallest prodctl deployment contract to OneWarden and verify its release/install behavior locally.
- Provision production infrastructure and app-specific secrets through existing contentoren-server automation.
- Deploy committed `HEAD`, verify internal and public health, configure Zitadel, then exercise the browser login flow.

## Tasks

- [x] 1. Add and verify OneWarden's bare prodctl manifest, install script, systemd unit, and protected production-env workflow. Deployment files and the missing shared scrollbar module are present, and the vault build and clean committed release packaging pass.
- [x] 2. Provision the `onewarden` prodctl app, allocated port `8303`, Linux user, DNS, and Cloudflare Tunnel route.
- [ ] 3. Provision dedicated R2 storage and create the complete app-owned `.env.production` without exposing secrets.
- [ ] 4. Provision the dedicated Zitadel project/client and place its credentials in `.env.production`.
- [ ] 5. Deploy committed OneWarden `HEAD` with prodctl and verify service, database migration, R2 access, and public health.
- [ ] 6. Test Zitadel login through the public web UI with `ssotest` and report the result.
