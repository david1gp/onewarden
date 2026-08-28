import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"

export function organizationMembershipRoleCheck(
  membership: OrganizationMembership,
  requiredRole: "admin" | "manager" | "member" | "owner",
): boolean {
  if (
    membership.status !== organizationMembershipStatus.invited &&
    membership.status !== organizationMembershipStatus.accepted &&
    membership.status !== organizationMembershipStatus.confirmed
  )
    return false
  if (requiredRole === "member") return organizationMembershipTypeLevel(membership.type) >= 0
  if (membership.status !== organizationMembershipStatus.confirmed) return false
  if (requiredRole === "owner") return membership.type === organizationMembershipType.owner
  const requiredLevel = requiredRole === "admin" ? 2 : 1
  return organizationMembershipTypeLevel(membership.type) >= requiredLevel
}

function organizationMembershipTypeLevel(type: number): number {
  if (type === organizationMembershipType.owner) return 3
  if (type === organizationMembershipType.admin) return 2
  if (type === organizationMembershipType.manager) return 1
  if (type === organizationMembershipType.user) return 0
  return -1
}
