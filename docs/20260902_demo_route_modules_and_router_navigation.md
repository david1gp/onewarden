# Demo route modules and router navigation

## Goal

Give demo pages their own typed `pageNameDemo`, `pageRouteDemo`, `urlDemo`, and `getRoutesDemo` structure, use those constants for all demo navigation, and remove manual `history.pushState` routing in favor of a Solid router-managed location and navigation API.

## Decisions

- Add `@solidjs/router` as the lightweight router for the authenticated Vite web bundle; do not restore the removed public TanStack Start application.
- Keep canonical demo URLs in the demo route module and preserve all existing demo aliases for direct-entry compatibility.
- Compose `getRoutesDemo` into the web-app route registry while keeping demo lazy imports owned by the demo context.
- Replace hard-coded demo navigation paths with `urlDemo` helpers.
- Route programmatic navigation, same-origin internal links, back/forward updates, and route replacement through router APIs; application code must not call `history.pushState`.
- Preserve non-navigation URL cleanup/state synchronization that requires replace semantics, migrating it to the central router replace API where it belongs.

## Approach

- Establish the router at the authenticated web mount and adapt web-app state to consume router location/navigation rather than owning browser history.
- Extract demo page names, canonical route patterns, URL helpers, aliases, matcher, and lazy route definitions into demo-owned modules.
- Update demo directory, header, settings, and admin navigation to consume demo URL helpers and injected router navigation.
- Remove duplicate popstate/click/history ownership and keep current auth, session handoff, route revision, parameter, and deep-link behavior.
- Verify route contracts, navigation, browser back/forward, direct entries, lazy chunks, and production build behavior.

## Tasks

- [x] 1. Add and mount `@solidjs/router`, expose router-managed location/navigation to web-app state, and remove central manual `pushState`, `popstate`, and same-origin click history handling without changing route behavior.
- [x] 2. Add demo-owned page-name, page-route, URL, alias/matcher, and lazy-route modules; compose them into web-app matching/rendering and preserve every existing demo URL.
- [x] 3. Refactor all demo links and programmatic transitions to use `urlDemo` and router navigation, removing demo-local `pushState`/`popstate` ownership.
- [x] 4. Migrate remaining authenticated-web route navigation and replace-style URL synchronization to the central router API so authenticated web code contains no direct History API writes.
- [x] 5. Update unit, integration, and browser coverage, then run formatting, typecheck, lint, focused tests, browser navigation verification, and `build:vault`.
