import type { IdentityUser } from "../identity/identityUser.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"

export function organizationMembershipUserMiniDetailsToJson(
  membership: OrganizationMembership,
  user: IdentityUser,
): Record<string, unknown> {
  return {
    email: user.email,
    id: membership.uuid,
    name: user.name,
    object: "organizationUserUserMiniDetails",
    status:
      membership.status < organizationMembershipStatus.revoked
        ? organizationMembershipStatus.revoked
        : membership.status,
    type: membership.type === organizationMembershipType.manager ? 4 : membership.type,
    userId: membership.userUuid,
  }
}
