import * as v from "valibot"

export const organizationWorkspaceDialogSchema = v.picklist([
  "create-org",
  "invite-member",
  "create-collection",
  "create-group",
  "create-domain",
])

export type OrganizationWorkspaceDialog = v.InferOutput<typeof organizationWorkspaceDialogSchema>
