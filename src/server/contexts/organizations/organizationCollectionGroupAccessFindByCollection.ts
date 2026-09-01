import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, asc, eq } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { groups } from "../../database/schema/groups.js"
import type { OrganizationCollectionGroupAccess } from "./organizationCollectionGroupAccess.js"

export function organizationCollectionGroupAccessFindByCollection(
  database: DatabaseConnection,
  organizationUuid: string,
  collectionUuid: string,
): Result<OrganizationCollectionGroupAccess[]> {
  const op = "organizationCollectionGroupAccessFindByCollection"
  try {
    const rows = database.drizzle
      .select({
        groupUuid: collectionsGroups.groupsUuid,
        hidePasswords: collectionsGroups.hidePasswords,
        manage: collectionsGroups.manage,
        readOnly: collectionsGroups.readOnly,
      })
      .from(collectionsGroups)
      .innerJoin(
        collections,
        and(eq(collections.uuid, collectionsGroups.collectionsUuid), eq(collections.orgUuid, organizationUuid)),
      )
      .innerJoin(
        groups,
        and(eq(groups.uuid, collectionsGroups.groupsUuid), eq(groups.organizationsUuid, collections.orgUuid)),
      )
      .where(eq(collectionsGroups.collectionsUuid, collectionUuid))
      .orderBy(asc(collectionsGroups.groupsUuid))
      .all()
    return resultCreate(
      rows.map((row) => ({
        groupUuid: row.groupUuid,
        hidePasswords: row.hidePasswords,
        manage: row.manage,
        readOnly: row.readOnly,
      })),
    )
  } catch {
    return resultErrorCreate(op, "Collection group access lookup failed.")
  }
}
