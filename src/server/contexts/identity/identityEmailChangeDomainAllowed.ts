import type { IdentityConfig } from "./identityConfigSchema.js"

export function identityEmailChangeDomainAllowed(config: IdentityConfig, email: string): boolean {
  const at = email.lastIndexOf("@")
  if (at < 1 || at === email.length - 1) return false
  const whitelist = config.SIGNUPS_DOMAINS_WHITELIST.split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => domain.length > 0)
  if (whitelist.length === 0) return true
  return whitelist.includes(email.slice(at + 1).toLowerCase())
}
