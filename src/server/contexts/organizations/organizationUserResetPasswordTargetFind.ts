import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"
import type { Organization } from "./organization.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"
import { organizationMembershipFindByUuidAndOrganization } from "./organizationMembershipFindByUuidAndOrganization.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"

export function organizationUserResetPasswordTargetFind(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
  operation: string,
): Result<{ membership: OrganizationMembership; organization: Organization; user: IdentityUser }> {
  const organizationResult = organizationFindByUuid(database, organizationUuid)
  if (!organizationResult.success) return organizationResult
  if (organizationResult.data === null) return organizationErrorCreate(operation, "Required organization not found")

  const membershipResult = organizationMembershipFindByUuidAndOrganization(
    database,
    membershipUuid,
    organizationResult.data.uuid,
  )
  if (!membershipResult.success) return membershipResult
  if (membershipResult.data === null)
    return organizationErrorCreate(operation, "User to reset isn't member of required organization")

  const userResult = identityUserFindByUuid(database, membershipResult.data.userUuid)
  if (!userResult.success) return userResult
  if (userResult.data === null) return organizationErrorCreate(operation, "User not found")

  return resultCreate({
    membership: membershipResult.data,
    organization: organizationResult.data,
    user: userResult.data,
  })
}
