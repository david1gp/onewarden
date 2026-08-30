import * as v from "valibot"

export const adminDialogSchema = v.object({
  kind: v.picklist(["inviteUser", "userDetails", "organizationDetails", "organizationRole", "settings"]),
  entityId: v.nullable(v.string()),
})

export type AdminDialog = v.InferOutput<typeof adminDialogSchema>
