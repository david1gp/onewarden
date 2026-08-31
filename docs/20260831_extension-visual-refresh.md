# Extension visual refresh

## Goal

Give every extension surface a consistent, accessible color system and expose all extension pages and important visual states at `/demo/extension` for review.

## Decisions

- Use a restrained blue-and-slate palette: slate for surfaces and neutral states, blue for primary and selected states, and red/amber/green only for semantic feedback.
- Reuse production extension views where browser-safe; isolate deterministic demo fixtures from Chrome APIs.
- Reuse `./ui` components through `#ui/...` imports and existing package dependencies.
- Make `/demo/extension` a visual gallery covering popup, full-window vault, generator, settings, and passkey-consent variants.
- Keep production document semantics as defaults and use instance-specific semantics only when repeated inside the gallery.

## Approach

- Normalize extension surfaces, borders, text, hover, focus, selection, and dark-mode contrast without broad shared-UI changes.
- Add browser-safe fixture models and a demo gallery that renders each important page/state at realistic dimensions.
- Register and advertise the route, then verify routing, responsive layout, themes, accessibility, and representative interactions in a browser.

## Tasks

- [x] 1. Refresh the extension color treatment across popup, full-window vault, generator, settings, and passkey-consent views.
- [x] 2. Add deterministic browser-safe fixtures and the `/demo/extension` gallery for all extension pages and key states.
- [x] 3. Register `/demo/extension` in web routing and the demo directory.
- [x] 4. Add or update automated coverage for the new route and visual-state gallery.
- [x] 5. Run browser verification for desktop/mobile layouts, light/dark themes, and representative controls; fix any issues found.
- [x] 6. Make repeated production surfaces semantically valid when composed in the extension demo gallery.
