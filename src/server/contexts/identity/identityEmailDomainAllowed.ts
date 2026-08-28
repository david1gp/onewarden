import type { IdentityConfig } from "./identityConfigSchema.js"

export function identityEmailDomainAllowed(config: IdentityConfig, email: string): boolean {
  const whitelist = config.SIGNUPS_DOMAINS_WHITELIST.split(",")
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0)
  if (whitelist.length === 0) return true
  const at = email.lastIndexOf("@")
  if (at < 1 || at === email.length - 1) return false
  return whitelist.includes(email.slice(at + 1).toLowerCase())
}
