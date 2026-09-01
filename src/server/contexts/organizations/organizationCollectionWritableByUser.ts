import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq, exists, isNotNull, lte, or } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"

export function organizationCollectionWritableByUser(
  database: DatabaseConnection,
  collectionUuid: string,
  userUuid: string,
  organizationUuid: string,
  groupsEnabled = false,
  confirmedOnly = true,
): Result<boolean> {
  const op = "organizationCollectionWritableByUser"
  try {
    const groupAccess = exists(
      database.drizzle
        .select({ one: groupsUsers.groupsUuid })
        .from(groupsUsers)
        .innerJoin(
          groups,
          and(eq(groups.uuid, groupsUsers.groupsUuid), eq(groups.organizationsUuid, collections.orgUuid)),
        )
        .leftJoin(
          collectionsGroups,
          and(eq(collectionsGroups.groupsUuid, groups.uuid), eq(collectionsGroups.collectionsUuid, collections.uuid)),
        )
        .where(
          and(
            eq(groupsUsers.usersOrganizationsUuid, usersOrganizations.uuid),
            or(
              eq(groups.accessAll, true),
              and(isNotNull(collectionsGroups.collectionsUuid), eq(collectionsGroups.readOnly, false)),
            ),
          ),
        ),
    )
    const accessConditions = [
      eq(usersOrganizations.accessAll, true),
      lte(usersOrganizations.atype, 1),
      and(isNotNull(usersCollections.collectionUuid), eq(usersCollections.readOnly, false)),
      ...(groupsEnabled ? [groupAccess] : []),
    ]
    const conditions = [
      eq(collections.uuid, collectionUuid),
      eq(collections.orgUuid, organizationUuid),
      eq(usersOrganizations.userUuid, userUuid),
      ...(confirmedOnly ? [eq(usersOrganizations.status, 2)] : []),
    ]
    const row = database.drizzle
      .select({ uuid: collections.uuid })
      .from(collections)
      .innerJoin(usersOrganizations, eq(usersOrganizations.orgUuid, collections.orgUuid))
      .leftJoin(
        usersCollections,
        and(eq(usersCollections.collectionUuid, collections.uuid), eq(usersCollections.userUuid, userUuid)),
      )
      .where(and(...conditions, or(...accessConditions)))
      .limit(1)
      .get()
    return resultCreate(row !== undefined)
  } catch {
    return resultErrorCreate(op, "Collection write access lookup failed.")
  }
}
