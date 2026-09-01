import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq, inArray } from "drizzle-orm"
import { collections as collectionsTable } from "../../database/schema/collections.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import type { OrganizationCollectionAccessData } from "./organizationCollectionAccessDataSchema.js"
import { organizationCollectionRevisionUpdate } from "./organizationCollectionRevisionUpdate.js"
import { organizationGroupAffectedUserUuidsFind } from "./organizationGroupAffectedUserUuidsFind.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"

export function organizationCollectionGroupAccessReplace(
  database: DatabaseConnection,
  organizationUuid: string,
  groupUuid: string,
  collections: readonly OrganizationCollectionAccessData[],
  revisionDate: string,
): Result<void> {
  const op = "organizationCollectionGroupAccessReplace"
  const collectionIds = [...new Set(collections.map((collection) => collection.id))]
  if (collectionIds.length > 0) {
    try {
      const rows = database.drizzle
        .select({ uuid: collectionsTable.uuid })
        .from(collectionsTable)
        .where(and(eq(collectionsTable.orgUuid, organizationUuid), inArray(collectionsTable.uuid, collectionIds)))
        .all()
      const existingIds = new Set(rows.map((row) => row.uuid))
      const invalidId = collectionIds.find((collectionId) => !existingIds.has(collectionId))
      if (invalidId !== undefined)
        return organizationErrorCreate(op, `Invalid collection ${invalidId} for organization ${organizationUuid}`)
    } catch {
      return resultErrorCreate(op, "Organization collection lookup failed.")
    }
  }

  const beforeResult = organizationGroupAffectedUserUuidsFind(database, organizationUuid, groupUuid)
  if (!beforeResult.success) return beforeResult
  try {
    database.drizzle.delete(collectionsGroups).where(eq(collectionsGroups.groupsUuid, groupUuid)).run()
    for (const collection of collections) {
      database.drizzle
        .insert(collectionsGroups)
        .values({
          collectionsUuid: collection.id,
          groupsUuid: groupUuid,
          readOnly: collection.readOnly,
          hidePasswords: collection.hidePasswords,
          manage: collection.manage,
        })
        .onConflictDoUpdate({
          target: [collectionsGroups.collectionsUuid, collectionsGroups.groupsUuid],
          set: {
            readOnly: collection.readOnly,
            hidePasswords: collection.hidePasswords,
            manage: collection.manage,
          },
        })
        .run()
    }
  } catch {
    return resultErrorCreate(op, "Group collection access update failed.")
  }

  const afterResult = organizationGroupAffectedUserUuidsFind(database, organizationUuid, groupUuid)
  if (!afterResult.success) return afterResult
  const userUuids = [...new Set([...beforeResult.data, ...afterResult.data])]
  const revisionResult = organizationCollectionRevisionUpdate(database, userUuids, revisionDate)
  if (!revisionResult.success) return revisionResult
  return resultCreate(undefined)
}
