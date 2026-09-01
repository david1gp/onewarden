import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { and, count, eq, inArray, ne } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { users } from "../../database/schema/users.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
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
      database.drizzle.update(users).set({ updatedAt: revisionDate }).where(eq(users.uuid, member.userUuid)).run()
      const collectionUuids = database.drizzle
        .select({ uuid: collections.uuid })
        .from(collections)
        .where(eq(collections.orgUuid, organizationUuid))
      database.drizzle
        .delete(usersCollections)
        .where(
          and(
            eq(usersCollections.userUuid, member.userUuid),
            inArray(usersCollections.collectionUuid, collectionUuids),
          ),
        )
        .run()
      database.drizzle.delete(groupsUsers).where(eq(groupsUsers.usersOrganizationsUuid, member.uuid)).run()
      if (!mailEnabled) {
        const invitedMembership = database.drizzle
          .select({ uuid: usersOrganizations.uuid })
          .from(usersOrganizations)
          .where(
            and(
              eq(usersOrganizations.userUuid, member.userUuid),
              eq(usersOrganizations.status, organizationMembershipStatus.invited),
              ne(usersOrganizations.uuid, member.uuid),
            ),
          )
          .limit(1)
          .get()
        if (invitedMembership === undefined) {
          const user = database.drizzle
            .select({ email: users.email })
            .from(users)
            .where(eq(users.uuid, member.userUuid))
            .limit(1)
            .get()
          if (user !== undefined) {
            const invitationResult = identityInvitationTake(database, user.email)
            if (!invitationResult.success) return invitationResult
          }
        }
      }
      database.drizzle
        .delete(usersOrganizations)
        .where(and(eq(usersOrganizations.uuid, member.uuid), eq(usersOrganizations.orgUuid, organizationUuid)))
        .run()
      return resultCreate({ userUuid: member.userUuid })
    } catch {
      return resultErrorCreate(op, "Organization membership removal failed.")
    }
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
