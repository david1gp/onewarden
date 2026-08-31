import * as v from "valibot"

export const organizationWorkspaceTabSchema = v.picklist([
  "settings",
  "members",
  "collections",
  "groups",
  "policies",
  "events",
  "domains",
  "sso",
])

export type OrganizationWorkspaceTab = v.InferOutput<typeof organizationWorkspaceTabSchema>
