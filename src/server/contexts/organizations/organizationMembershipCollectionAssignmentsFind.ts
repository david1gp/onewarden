import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, asc, eq } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"

export function organizationMembershipCollectionAssignmentsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
  groupsEnabled: boolean,
): Result<Array<{ hidePasswords: boolean; id: string; manage: boolean; readOnly: boolean }>> {
  const op = "organizationMembershipCollectionAssignmentsFind"
  try {
    const membership = database.drizzle
      .select({ userUuid: usersOrganizations.userUuid })
      .from(usersOrganizations)
      .where(and(eq(usersOrganizations.uuid, membershipUuid), eq(usersOrganizations.orgUuid, organizationUuid)))
      .limit(1)
      .get()
    if (membership === undefined) return resultCreate([])
    if (groupsEnabled) {
      const fullAccessGroup = database.drizzle
        .select({ uuid: groups.uuid })
        .from(groupsUsers)
        .innerJoin(groups, eq(groups.uuid, groupsUsers.groupsUuid))
        .where(
          and(
            eq(groupsUsers.usersOrganizationsUuid, membershipUuid),
            eq(groups.organizationsUuid, organizationUuid),
            eq(groups.accessAll, true),
          ),
        )
        .limit(1)
        .get()
      if (fullAccessGroup !== undefined) return resultCreate([])
    }
    const rows = database.drizzle
      .select({
        collectionUuid: usersCollections.collectionUuid,
        hidePasswords: usersCollections.hidePasswords,
        manage: usersCollections.manage,
        readOnly: usersCollections.readOnly,
      })
      .from(usersCollections)
      .innerJoin(collections, eq(collections.uuid, usersCollections.collectionUuid))
      .where(and(eq(usersCollections.userUuid, membership.userUuid), eq(collections.orgUuid, organizationUuid)))
      .orderBy(asc(usersCollections.collectionUuid))
      .all()
    return resultCreate(
      rows.map((row) => ({
        hidePasswords: row.hidePasswords,
        id: row.collectionUuid,
        manage: row.manage,
        readOnly: row.readOnly,
      })),
    )
  } catch {
    return resultErrorCreate(op, "Organization collection assignment lookup failed.")
  }
}
