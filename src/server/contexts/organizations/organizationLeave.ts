import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { and, count, eq, inArray } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { users } from "../../database/schema/users.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"

export function organizationLeave(
  database: DatabaseConnection,
  membership: OrganizationMembership,
  revisionDate: string,
): Result<void> {
  return databaseTransaction(database, () => {
    if (membership.status !== organizationMembershipStatus.confirmed)
      return organizationErrorCreate(
        "organizationLeave",
        "You need to be a Member of the Organization to call this endpoint",
      )

    try {
      if (membership.type === organizationMembershipType.owner) {
        const ownerCount = database.drizzle
          .select({ count: count() })
          .from(usersOrganizations)
          .where(
            and(
              eq(usersOrganizations.orgUuid, membership.organizationUuid),
              eq(usersOrganizations.status, organizationMembershipStatus.confirmed),
              eq(usersOrganizations.atype, organizationMembershipType.owner),
            ),
          )
          .get()?.count
        if (ownerCount === undefined || ownerCount <= 1)
          return organizationErrorCreate("organizationLeave", "The last owner can't leave")
      }

      database.drizzle.update(users).set({ updatedAt: revisionDate }).where(eq(users.uuid, membership.userUuid)).run()
      const collectionUuids = database.drizzle
        .select({ uuid: collections.uuid })
        .from(collections)
        .where(eq(collections.orgUuid, membership.organizationUuid))
      database.drizzle
        .delete(usersCollections)
        .where(
          and(
            eq(usersCollections.userUuid, membership.userUuid),
            inArray(usersCollections.collectionUuid, collectionUuids),
          ),
        )
        .run()
      database.drizzle.delete(groupsUsers).where(eq(groupsUsers.usersOrganizationsUuid, membership.uuid)).run()
      database.drizzle.delete(usersOrganizations).where(eq(usersOrganizations.uuid, membership.uuid)).run()
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("organizationLeave", "Organization leave failed.")
    }
  })
}
