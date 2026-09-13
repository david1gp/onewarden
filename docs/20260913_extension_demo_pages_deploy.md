# Extension demo Pages deployment

## Goal

Add and use a dedicated Cloudflare Pages deployment workflow for the backend-free web extension demo, including a working direct `/demo/extension` URL.

## Decisions

- Deploy the web SPA build separately from the existing generic `onewarden-site` deployment.
- Use a dedicated Cloudflare Pages project so the existing site is not replaced.
- Include Cloudflare Pages SPA fallback routing so direct demo URLs resolve.
- Keep the deployment commands in `package.json` and reuse existing repository tooling.

## Approach

- Add scripts that build the web SPA, place the required Pages routing file in its output, and upload that output to a dedicated Pages project.
- Verify the generated static output and demo route locally.
- Commit and push the deployment workflow, then execute it and verify the public demo URL in a browser.

## Tasks

- [x] 1. Add the dedicated extension-demo Pages build and deployment scripts.
- [x] 2. Verify the static build and direct demo route locally.
- [x] 3. Commit and push the deployment workflow.
- [ ] 4. Deploy the demo Pages project and verify its public `/demo/extension` URL.
