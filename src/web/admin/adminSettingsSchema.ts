import * as v from "valibot"

const adminSettingsOverrideSchema = v.picklist([
  "signupsAllowed",
  "invitationsAllowed",
  "mailEnabled",
  "ssoEnabled",
  "twoFactorEnabled",
  "adminTokenDisabled",
])

export const adminSettingsSchema = v.object({
  signupsAllowed: v.boolean(),
  invitationsAllowed: v.boolean(),
  mailEnabled: v.boolean(),
  ssoEnabled: v.boolean(),
  twoFactorEnabled: v.boolean(),
  adminTokenDisabled: v.boolean(),
  sessionLifetimeMinutes: v.pipe(v.number(), v.integer(), v.minValue(1)),
  invitationExpirationHours: v.pipe(v.number(), v.integer(), v.minValue(1)),
  overrides: v.array(adminSettingsOverrideSchema),
})

export type AdminSettings = v.InferOutput<typeof adminSettingsSchema>
export type AdminSettingsOverride = v.InferOutput<typeof adminSettingsOverrideSchema>
