# Goal

Align every `/demo/*` vault experience with the current Vaultwarden-compatible Bitwarden web-vault display and behavior, including correct Favorites semantics and working item/trash actions.

# Decisions

- Treat the Vaultwarden-bundled Bitwarden web vault and official Bitwarden documentation as the UI/behavior reference.
- Keep all behavior local to the demo; persist shared demo state for the browser session without adding backend APIs.
- Use standard item types only: Login, Secure Note, Card, Identity, and SSH Key.
- Represent personal and organization ownership, collections, and folders separately rather than treating Work, Personal, and Shared as peer vaults.
- Change Favorites through the item edit/save flow and limit them to eligible personal items.
- Organization items require collections; folders remain user-specific and independent of ownership.
- Active lists exclude soft-deleted items; Trash owns restore and permanent-delete transitions.
- Implement only safe demo simulations for security-sensitive flows such as unlocking and clipboard use.

# Approach

- Establish an explicit reference matrix and automated coverage before changing behavior.
- Introduce one shared demo store used by every demo route.
- Align navigation, fixtures, labels, details, and responsive presentation with web-vault concepts.
- Add complete local item actions and trash lifecycle behavior, then verify all routes in desktop and mobile browsers.
- Current context: add, edit, save, clone, Favorite, PAN masking, and confirmed soft-delete flows are implemented and session-persistent; task 5 exposes the shared deleted-item lifecycle in Trash.

# Tasks

- [x] 1. Document the reference feature matrix and add focused state/route tests for current gaps.
- [x] 2. Add a shared session-persistent demo store and correct ownership, collection, folder, item-type, and Favorites modeling.
- [x] 3. Align vault navigation, lists, details, labels, and selected-item routes with the corrected model.
- [x] 4. Implement add/edit/save/clone/move-to-trash item flows, including Favorites eligibility and persistence.
- [ ] 5. Implement Trash restore and permanent-delete flows and align empty states/counts.
- [ ] 6. Align lock/unlock behavior and complete copy/reveal/search/filter interactions across responsive layouts.
- [ ] 7. Add browser coverage for all demo routes and interactions, then run the full project checks.

# Paths

- `src/web/demo/`
- `src/web/ui/`
- `tests/unit/`
- `tests/browser/`
- `docs/20260829_vaultwarden_demo_alignment.md`
