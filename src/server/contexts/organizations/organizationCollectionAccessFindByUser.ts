import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, asc, desc, eq, isNotNull, or } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"

export function organizationCollectionAccessFindByUser(
  database: DatabaseConnection,
  collectionUuid: string,
  userUuid: string,
  groupsEnabled = false,
): Result<{ hidePasswords: boolean; manage: boolean; readOnly: boolean } | null> {
  const op = "organizationCollectionAccessFindByUser"
  try {
    const row = database.drizzle
      .select({
        hidePasswords: usersCollections.hidePasswords,
        manage: usersCollections.manage,
        readOnly: usersCollections.readOnly,
      })
      .from(usersCollections)
      .where(and(eq(usersCollections.collectionUuid, collectionUuid), eq(usersCollections.userUuid, userUuid)))
      .limit(1)
      .get()
    if (row !== undefined)
      return resultCreate({
        hidePasswords: row.hidePasswords,
        manage: row.manage,
        readOnly: row.readOnly,
      })
    if (!groupsEnabled) return resultCreate(null)
    const groupRow = database.drizzle
      .select({
        accessAll: groups.accessAll,
        hidePasswords: collectionsGroups.hidePasswords,
        manage: collectionsGroups.manage,
        readOnly: collectionsGroups.readOnly,
      })
      .from(collections)
      .innerJoin(
        usersOrganizations,
        and(eq(usersOrganizations.orgUuid, collections.orgUuid), eq(usersOrganizations.userUuid, userUuid)),
      )
      .innerJoin(groupsUsers, eq(groupsUsers.usersOrganizationsUuid, usersOrganizations.uuid))
      .innerJoin(
        groups,
        and(eq(groups.uuid, groupsUsers.groupsUuid), eq(groups.organizationsUuid, usersOrganizations.orgUuid)),
      )
      .leftJoin(
        collectionsGroups,
        and(eq(collectionsGroups.groupsUuid, groups.uuid), eq(collectionsGroups.collectionsUuid, collectionUuid)),
      )
      .where(
        and(
          eq(collections.uuid, collectionUuid),
          or(eq(groups.accessAll, true), isNotNull(collectionsGroups.collectionsUuid)),
        ),
      )
      .orderBy(desc(groups.accessAll), asc(groups.uuid))
      .limit(1)
      .get()
    return resultCreate(
      groupRow === undefined
        ? null
        : {
            hidePasswords: groupRow.accessAll ? false : (groupRow.hidePasswords ?? false),
            manage: groupRow.accessAll ? false : (groupRow.manage ?? false),
            readOnly: groupRow.accessAll ? false : (groupRow.readOnly ?? false),
          },
    )
  } catch {
    return resultErrorCreate(op, "Collection user access lookup failed.")
  }
}
