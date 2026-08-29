import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"

export function organizationMembershipHasFullAccess(membership: OrganizationMembership): boolean {
  return (
    membership.status === organizationMembershipStatus.confirmed &&
    (membership.accessAll || membership.type <= organizationMembershipType.admin)
  )
}
