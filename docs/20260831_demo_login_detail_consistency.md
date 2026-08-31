# Demo login detail consistency

## Goal

Make `/demo/login` use one compact, consistent three-column vault detail layout without title wrapping or column clipping, with clearer notes, ordered content, and a responsive action grid.

## Decisions

- Keep `CipherDetailView` as the shared detail renderer; remove divergent layout behavior rather than adding another component.
- Give all three workspace columns stable DOM IDs.
- Make Edit the primary action and arrange the six actions, including favorite, in a responsive grid.
- Show the updated timestamp only in the bottom metadata section and remove the extra header divider/spacing.
- Place attachments after notes.
- Allow detail fields to use two columns when space permits and one column otherwise.
- Reuse existing `#ui/...` components and installed libraries.

## Approach

- First correct the workspace sizing, IDs, and overflow constraints.
- Then consolidate the detail header/action/content layout in the shared renderer.
- Add focused browser coverage and visually verify `/demo/login` across representative selections and widths.
- Finish with repository checks, conventional commits, push, and deployment using the repository's existing workflow.

## Tasks

- [x] 1. Add IDs to the three workspace columns and fix first/second-column cutoff behavior.
- [x] 2. Refactor the shared cipher detail header and actions: prevent title wrapping, remove duplicate updated text/divider, make Edit primary, and show all six actions in a responsive grid.
- [x] 3. Make detail content compact and responsive: notes before attachments, stronger notes contrast, and two-column fields when width allows.
- [x] 4. Update focused browser coverage and verify the selected first four second-column entries at relevant widths.
- [ ] 5. Run final checks, use the commits skill to create and push conventional commits, then deploy with the existing project workflow.
