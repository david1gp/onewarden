import * as v from "valibot"

export const adminConfirmationSchema = v.object({
  action: v.picklist([
    "remove2fa",
    "deauthorizeSessions",
    "disableUser",
    "enableUser",
    "deleteUser",
    "removeSsoAssociation",
    "resendInvitation",
    "disableOrganization",
    "enableOrganization",
    "deleteOrganization",
    "resetSettings",
  ]),
  entityId: v.nullable(v.string()),
  title: v.string(),
  message: v.string(),
  requiredInput: v.optional(v.string()),
})

export type AdminConfirmation = v.InferOutput<typeof adminConfirmationSchema>
