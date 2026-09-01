import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, asc, eq } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { groups } from "../../database/schema/groups.js"
import type { OrganizationCollectionAccessData } from "./organizationCollectionAccessDataSchema.js"

export function organizationGroupCollectionsFindByGroup(
  database: DatabaseConnection,
  groupUuid: string,
  organizationUuid: string,
): Result<OrganizationCollectionAccessData[]> {
  const op = "organizationGroupCollectionsFindByGroup"
  try {
    const rows = database.drizzle
      .select({
        collectionUuid: collectionsGroups.collectionsUuid,
        hidePasswords: collectionsGroups.hidePasswords,
        manage: collectionsGroups.manage,
        readOnly: collectionsGroups.readOnly,
      })
      .from(collectionsGroups)
      .innerJoin(
        groups,
        and(eq(groups.uuid, collectionsGroups.groupsUuid), eq(groups.organizationsUuid, organizationUuid)),
      )
      .innerJoin(
        collections,
        and(eq(collections.uuid, collectionsGroups.collectionsUuid), eq(collections.orgUuid, groups.organizationsUuid)),
      )
      .where(eq(collectionsGroups.groupsUuid, groupUuid))
      .orderBy(asc(collectionsGroups.collectionsUuid))
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
    return resultErrorCreate(op, "Group collection access lookup failed.")
  }
}
