# Demo Settings Page

## Goal

Add a complete, interactive settings experience under `/demo/settings` that demonstrates every user-facing account setting currently supported by the application and is reachable from the demo vault and demo directory.

## Decisions

- Mirror the existing settings information architecture: Profile, Security, Email, Devices, Emergency Access, Tools, and Danger Zone.
- Keep the demo self-contained: interactions update demo state or show demo feedback and never call account APIs.
- Include appearance/theme alongside account settings; keep server administration settings in the existing `/demo/admin` experience.
- Reuse components from `./ui` through `#ui/...` imports and follow existing demo responsive patterns.
- Treat `/demo/settings` and its section URLs as SPA routes while preserving the existing real `/settings` behavior.

## Approach

- Add demo settings data/state and views composed from small section components.
- Add route resolution, server SPA allowlisting, demo navigation, and directory discoverability.
- Add focused automated coverage for routing, section interactions, responsive behavior, and theme behavior.
- Run repository checks, then use the requested commit workflow and deploy from the clean committed tree.

## Tasks

- [x] 1. Implement the demo settings route shell, responsive navigation, and all supported settings sections with local demo interactions.
- [x] 2. Integrate settings routes into SPA routing, the demo directory, and vault navigation.
- [x] 3. Add and run focused automated tests for the demo settings experience.
- [x] 4. Run final repository verification and fix scoped failures.
- [ ] 5. Commit and push with the `/commits` skill, then deploy and verify production health. (In progress.)
