# Structured lazy web routes

## Goal

Replace the authenticated web app's ordered pathname resolver and top-level `Switch`/`Match` renderer with typed `pageNameWebApp`, `pageRouteWebApp`, `urlWebApp`, and `getRoutesWebApp` modules modeled on `convex-auth-solid`, while lazy-loading each page and preserving every existing URL, alias, auth gate, deep link, and History API behavior.

## Decisions

- Keep the authenticated app's existing History API navigation and state lifecycle; do not restore or add TanStack Router for this separate web bundle.
- Use one typed, data-driven route registry with explicit aliases and a generic specificity-based matcher supporting dynamic path parameters.
- Lazy-load route pages with `solid-js/lazy`; adapters receive the existing shared web-app state rather than creating page-local app state.
- Keep `webAppRouteResolve` as a compatibility shim for existing callers and tests, but remove its ordered pathname logic.
- Preserve unknown-path fallback to the root page and all current case/trailing-slash semantics.
- Reuse existing dependencies and UI components; add no routing dependency.

## Approach

- Define typed page names, route patterns, canonical URL builders, and lazy route descriptors in dedicated web URL modules.
- Match the current pathname generically, extracting cipher and send parameters without route-specific condition chains.
- Render the matched lazy component through a route host responsible for the existing authentication, unlock, and admin-session gates.
- Reduce `WebApp` to app-state setup, shared shell/chrome, route host, and toaster responsibilities.
- Preserve production SPA deep-link registration for every supported route.

## Tasks

- [x] 1. Add the typed route contract, canonical URL helpers, generic matcher, compatibility resolver, and focused unit tests covering aliases, precedence, parameters, normalization, and fallback.
- [x] 2. Add the lazy route registry and route host, then replace `WebApp`'s static page imports and top-level route switch while preserving all page props and access gates.
- [x] 3. Integrate route matches into `webAppStateCreate`, preserving navigation/session behavior and dynamic cipher/send IDs, and update affected unit tests.
- [x] 4. Complete the production deep-link allowlist and browser coverage for representative lazy routes and history navigation.
- [x] 5. Run formatting, type checks, lint, focused unit/browser tests, and the authenticated web production build; fix only migration regressions.
