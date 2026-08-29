import type { AdminSettings } from "../admin/adminSettingsSchema.js"

export const adminSettingsDemoData: AdminSettings = {
  signupsAllowed: true,
  invitationsAllowed: true,
  mailEnabled: true,
  ssoEnabled: false,
  twoFactorEnabled: true,
  adminTokenDisabled: false,
  sessionLifetimeMinutes: 60,
  invitationExpirationHours: 120,
  overrides: ["mailEnabled", "twoFactorEnabled"],
}
