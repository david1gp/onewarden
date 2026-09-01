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

export function organizationCollectionManageableByUser(
  database: DatabaseConnection,
  collectionUuid: string,
  userUuid: string,
  organizationUuid: string,
  groupsEnabled = false,
): Result<boolean> {
  const op = "organizationCollectionManageableByUser"
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
              and(isNotNull(collectionsGroups.collectionsUuid), eq(collectionsGroups.manage, true)),
            ),
          ),
        ),
    )
    const accessConditions = [
      and(eq(usersCollections.collectionUuid, collections.uuid), eq(usersCollections.manage, true)),
      eq(usersOrganizations.accessAll, true),
      lte(usersOrganizations.atype, 1),
      ...(groupsEnabled ? [groupAccess] : []),
    ]
    const row = database.drizzle
      .select({ uuid: collections.uuid })
      .from(collections)
      .leftJoin(
        usersCollections,
        and(eq(usersCollections.collectionUuid, collections.uuid), eq(usersCollections.userUuid, userUuid)),
      )
      .leftJoin(
        usersOrganizations,
        and(eq(usersOrganizations.orgUuid, collections.orgUuid), eq(usersOrganizations.userUuid, userUuid)),
      )
      .where(
        and(eq(collections.uuid, collectionUuid), eq(collections.orgUuid, organizationUuid), or(...accessConditions)),
      )
      .limit(1)
      .get()
    return resultCreate(row !== undefined)
  } catch {
    return resultErrorCreate(op, "Collection manageability lookup failed.")
  }
}
