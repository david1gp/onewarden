import type { AdminConfig } from "./adminConfigSchema.js"

export function adminConfigCreate(overrides?: Partial<AdminConfig>): AdminConfig {
  return {
    ADMIN_TOKEN: overrides?.ADMIN_TOKEN,
    DISABLE_ADMIN_TOKEN: overrides?.DISABLE_ADMIN_TOKEN ?? false,
    ADMIN_SESSION_LIFETIME: overrides?.ADMIN_SESSION_LIFETIME ?? 20,
    INVITATION_ORG_NAME: overrides?.INVITATION_ORG_NAME ?? "Vaultwarden",
  }
}
