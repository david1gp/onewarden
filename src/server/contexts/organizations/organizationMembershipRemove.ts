import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { identityInvitationTake } from "../identity/identityInvitationTake.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipFindByUuidAndOrganization } from "./organizationMembershipFindByUuidAndOrganization.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"

export function organizationMembershipRemove(
  database: DatabaseConnection,
  actorMembership: OrganizationMembership,
  organizationUuid: string,
  membershipUuid: string,
  revisionDate: string,
  mailEnabled: boolean,
): Result<{ userUuid: string }> {
  return databaseTransaction(database, () => {
    const op = "organizationMembershipRemove"
    const memberResult = organizationMembershipFindByUuidAndOrganization(database, membershipUuid, organizationUuid)
    if (!memberResult.success) return memberResult
    if (memberResult.data === null)
      return organizationErrorCreate(op, "User to delete isn't member of the organization")
    const member = memberResult.data
    if (member.type !== organizationMembershipType.user && actorMembership.type !== organizationMembershipType.owner)
      return organizationErrorCreate(op, "Only Owners can delete Admins or Owners")
    if (
      member.type === organizationMembershipType.owner &&
      member.status === organizationMembershipStatus.confirmed &&
      organizationMembershipConfirmedOwnerCount(database, organizationUuid) <= 1
    )
      return organizationErrorCreate(op, "Can't delete the last owner")

    try {
      database.run("UPDATE users SET updated_at = ? WHERE uuid = ?", [revisionDate, member.userUuid])
      database.run(
        `DELETE FROM users_collections
         WHERE user_uuid = ?
           AND collection_uuid IN (SELECT uuid FROM collections WHERE org_uuid = ?)`,
        [member.userUuid, organizationUuid],
      )
      database.run("DELETE FROM groups_users WHERE users_organizations_uuid = ?", [member.uuid])
      if (!mailEnabled) {
        const invitedMembership = database
          .query<{ uuid: string }, [string, number, string]>(
            `SELECT uuid FROM users_organizations
             WHERE user_uuid = ? AND status = ? AND uuid != ? LIMIT 1`,
          )
          .get(member.userUuid, 0, member.uuid)
        if (invitedMembership === null) {
          const user = database
            .query<{ email: string }, [string]>("SELECT email FROM users WHERE uuid = ? LIMIT 1")
            .get(member.userUuid)
          if (user !== null) {
            const invitationResult = identityInvitationTake(database, user.email)
            if (!invitationResult.success) return invitationResult
          }
        }
      }
      database.run("DELETE FROM users_organizations WHERE uuid = ? AND org_uuid = ?", [member.uuid, organizationUuid])
      return resultCreate({ userUuid: member.userUuid })
    } catch {
      return resultErrorCreate(op, "Organization membership removal failed.")
    }
  })
}

function organizationMembershipConfirmedOwnerCount(database: DatabaseConnection, organizationUuid: string): number {
  return (
    database
      .query<{ count: number }, [string, number, number]>(
        "SELECT COUNT(*) AS count FROM users_organizations WHERE org_uuid = ? AND status = ? AND atype = ?",
      )
      .get(organizationUuid, organizationMembershipStatus.confirmed, organizationMembershipType.owner)?.count ?? 0
  )
}
