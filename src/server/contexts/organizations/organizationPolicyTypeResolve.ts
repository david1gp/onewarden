import type { OrganizationPolicyType } from "./organizationPolicy.js"
import { organizationPolicyType } from "./organizationPolicyType.js"

export function organizationPolicyTypeResolve(value: number): OrganizationPolicyType | undefined {
  if (!Number.isInteger(value)) return undefined
  if (value === organizationPolicyType.twoFactorAuthentication) return value
  if (value === organizationPolicyType.masterPassword) return value
  if (value === organizationPolicyType.passwordGenerator) return value
  if (value === organizationPolicyType.singleOrganization) return value
  if (value === organizationPolicyType.personalOwnership) return value
  if (value === organizationPolicyType.disableSend) return value
  if (value === organizationPolicyType.sendOptions) return value
  if (value === organizationPolicyType.resetPassword) return value
  if (value === organizationPolicyType.removeUnlockWithPin) return value
  if (value === organizationPolicyType.restrictedItemTypes) return value
  if (value === organizationPolicyType.uriMatchDefaults) return value
  return undefined
}
