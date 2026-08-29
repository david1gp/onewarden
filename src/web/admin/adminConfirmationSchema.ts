import * as v from "valibot"

export const adminConfirmationSchema = v.object({
  action: v.picklist(["disableUser", "deleteUser", "disableOrganization", "resetSettings"]),
  entityId: v.nullable(v.string()),
  title: v.string(),
  message: v.string(),
})

export type AdminConfirmation = v.InferOutput<typeof adminConfirmationSchema>
