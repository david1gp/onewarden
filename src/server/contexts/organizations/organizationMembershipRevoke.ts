import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { and, count, eq } from "drizzle-orm"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipFindByUuidAndOrganization } from "./organizationMembershipFindByUuidAndOrganization.js"
import { organizationMembershipSave } from "./organizationMembershipSave.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"

export function organizationMembershipRevoke(
  database: DatabaseConnection,
  actorMembership: OrganizationMembership,
  organizationUuid: string,
  membershipUuid: string,
  revisionDate: string,
): Result<{ userUuid: string }> {
  return databaseTransaction(database, () => {
    const op = "organizationMembershipRevoke"
    const memberResult = organizationMembershipFindByUuidAndOrganization(database, membershipUuid, organizationUuid)
    if (!memberResult.success) return memberResult
    if (memberResult.data === null) return organizationErrorCreate(op, "User not found in organization")
    const member = memberResult.data
    if (member.status <= -1) return organizationErrorCreate(op, "User is already revoked")
    if (member.userUuid === actorMembership.userUuid) return organizationErrorCreate(op, "You cannot revoke yourself")
    if (member.type === organizationMembershipType.owner && actorMembership.type !== organizationMembershipType.owner)
      return organizationErrorCreate(op, "Only owners can revoke other owners")
    if (
      member.type === organizationMembershipType.owner &&
      organizationMembershipConfirmedOwnerCount(database, organizationUuid) <= 1
    )
      return organizationErrorCreate(op, "Organization must have at least one confirmed owner")

    member.status -= 128
    const saveResult = organizationMembershipSave(database, member, revisionDate)
    if (!saveResult.success) return saveResult
    return resultCreate({ userUuid: member.userUuid })
  })
}

function organizationMembershipConfirmedOwnerCount(database: DatabaseConnection, organizationUuid: string): number {
  return (
    database.drizzle
      .select({ count: count() })
      .from(usersOrganizations)
      .where(
        and(
          eq(usersOrganizations.orgUuid, organizationUuid),
          eq(usersOrganizations.status, organizationMembershipStatus.confirmed),
          eq(usersOrganizations.atype, organizationMembershipType.owner),
        ),
      )
      .get()?.count ?? 0
  )
}
