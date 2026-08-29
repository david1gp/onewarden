# Demo admin

## Goal

Implement `/demo/admin` as a backend-free visual admin workspace modeled on Vaultwarden, with realistic settings, users, organizations, diagnostics, and interaction states built from reusable production-facing admin components.

## Decisions

- Keep reusable admin views and models under `src/web/admin`; keep deterministic demo state/data under `src/web/demo`.
- Use existing `#ui/...` components and existing domain concepts, adding only thin UI-facing schemas where admin response shapes are missing.
- Use one `/demo/admin` route with in-page navigation and local state so all visual states work without a backend.
- Cover representative healthy, warning, disabled, invited, overridden, confirmation, modal, search, and feedback states.

## Approach

- Add typed admin view models plus deterministic demo fixtures and state.
- Build a responsive shared admin shell with Settings, Users, Organizations, and Diagnostics views.
- Wire the demo route and demo-directory navigation into the existing web app.
- Add focused automated coverage and verify formatting, lint, types, and browser behavior.

## Tasks

- [x] 1. Define thin admin UI schemas, deterministic fixtures, and local demo state.
- [x] 2. Build reusable admin shell and page views from shared UI components.
- [x] 3. Wire `/demo/admin` into route resolution, app rendering, and demo navigation.
- [x] 4. Add automated tests and verify the complete demo flow.

## Paths

- `src/web/admin/**`
- `src/web/demo/**`
- `src/web/ui/WebApp.tsx`
- `src/web/ui/webAppRouteResolve.ts`
- `tests/browser/**`
