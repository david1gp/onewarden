import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { organizationMembershipFindByUuidAndOrganization } from "./organizationMembershipFindByUuidAndOrganization.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"

export function organizationMembershipUserDetailsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
): Result<{ membership: OrganizationMembership; user: IdentityUser } | null> {
  const op = "organizationMembershipUserDetailsFind"
  const membershipResult = organizationMembershipFindByUuidAndOrganization(database, membershipUuid, organizationUuid)
  if (!membershipResult.success) return membershipResult
  if (membershipResult.data === null) return resultCreate(null)
  const userResult = identityUserFindByUuid(database, membershipResult.data.userUuid)
  if (!userResult.success) return userResult
  if (userResult.data === null) return resultErrorCreate(op, "Error looking up user.")
  return resultCreate({ membership: membershipResult.data, user: userResult.data })
}
