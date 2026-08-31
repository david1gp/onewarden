# Entry favicons

## Goal

Show a website favicon beside each vault-list entry that has a valid HTTP(S) URL, while preserving the existing category icon as the loading/error fallback. Cache successfully fetched favicons for one week so the upstream site is not queried repeatedly.

## Decisions

- Reuse the existing `GET /icons/:host/icon.png` service and its SSRF-safe fetching, validation, and cache adapters; add no dependency or second fetch path. The list opts into `?fallback=error` so a generated server fallback produces an image error while the default endpoint contract remains compatible.
- Derive only the normalized hostname from an entry URL. Invalid URLs, unsupported schemes such as `ssh:`, and entries without a hostname keep the current category icon and make no favicon request.
- Apply the feature to the vault entry list, matching the Bitwarden reference behavior where the website image replaces the list placeholder after loading.
- Keep a fixed-size icon container to avoid layout shift. Treat the favicon as decorative (`alt=""`), load it lazily, decode it asynchronously through the shared `#ui` image primitive, ignore stale events from replaced URLs, and reveal the existing category icon if loading fails.
- Set the successful icon cache default and matching HTTP cache headers to `604800` seconds (one week). Keep the independently configured negative-cache default at three days.
- Continue allowing deployment overrides through `ICON_CACHE_TTL` and document that its unit is seconds.

## Approach

- Add a small pure URL-to-icon-path resolver and a focused list favicon view that composes existing `#ui` image/icon primitives.
- Integrate that view at the current leading-icon seam in `VaultEntryList`, without changing selection, filtering, or accessible button names.
- Change the centralized successful-icon TTL default so in-memory/filesystem expiry, `Cache-Control`, and `Expires` all remain driven by the same value.
- Cover URL normalization, fallback rendering, route cache lifetime, and end-to-end list behavior with focused unit, integration, and browser tests.

## Tasks

- [x] 1. Add and unit-test favicon host/path resolution for valid HTTP(S) URLs, ports/subdomains, missing URLs, malformed values, and unsupported schemes. Implemented as `vaultEntryFaviconPathResolve` using the built-in `URL` parser and returning `null` when no request should be made.
- [x] 2. Add the fixed-size favicon-with-category-fallback view and integrate it into `VaultEntryList`; verify decorative image semantics, lazy loading, error fallback, and unchanged no-URL rendering.
- [x] 3. Change the successful favicon cache default to one week in the icon configuration and document `ICON_CACHE_TTL=604800` plus the unchanged negative-cache setting in `.env.example`.
- [x] 4. Extend icon route integration coverage for one-week cache headers and refresh boundaries, then browser-test successful list favicons, failed-image fallback, and entries without website URLs.
