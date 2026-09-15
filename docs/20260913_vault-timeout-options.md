# Vault timeout options

## Goal
Add 1 day, 3 days, and 1 week wherever vault timeout is currently configurable, then commit and deploy.

## Decisions
- Use existing minute values: 1440, 4320, 10080.
- Preserve Lock and Log out actions and existing runtime behavior.
- The extension settings are the only existing configuration surface; web has no vault timeout setting.
- Use existing components and libraries.

## Approach
Extend the existing options and labels, add focused coverage, verify the settings in a browser, then use Luna for the commits skill and deployment.

## Tasks
1. Completed: Add duration options and focused automated coverage; run relevant checks.
2. Completed: Verify extension settings in a browser.
3. Completed: Have a fresh Luna subagent use the commits skill and push the changes.
4. Completed: Build the committed extension release artifact.
5. Pending: Publish the extension release to the user's chosen distribution destination.
