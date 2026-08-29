import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipFindByUuidAndOrganization } from "./organizationMembershipFindByUuidAndOrganization.js"
import { organizationMembershipSave } from "./organizationMembershipSave.js"
import { organizationMembershipType } from "./organizationMembershipType.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"

export function organizationMembershipRestore(
  database: DatabaseConnection,
  actorMembership: OrganizationMembership,
  organizationUuid: string,
  membershipUuid: string,
  revisionDate: string,
): Result<{ userUuid: string }> {
  return databaseTransaction(database, () => {
    const op = "organizationMembershipRestore"
    const memberResult = organizationMembershipFindByUuidAndOrganization(database, membershipUuid, organizationUuid)
    if (!memberResult.success) return memberResult
    if (memberResult.data === null) return organizationErrorCreate(op, "User not found in organization")
    const member = memberResult.data
    if (member.status >= 1) return organizationErrorCreate(op, "User is already active")
    if (member.userUuid === actorMembership.userUuid) return organizationErrorCreate(op, "You cannot restore yourself")
    if (member.type === organizationMembershipType.owner && actorMembership.type !== organizationMembershipType.owner)
      return organizationErrorCreate(op, "Only owners can restore other owners")

    if (member.status < 0) member.status += 128
    const saveResult = organizationMembershipSave(database, member, revisionDate)
    if (!saveResult.success) return saveResult
    return resultCreate({ userUuid: member.userUuid })
  })
}
