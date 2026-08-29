import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
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
    const placeholders = collectionIds.map(() => "?").join(", ")
    try {
      const rows = database
        .query<{ uuid: string }, string[]>(
          `SELECT uuid FROM collections
           WHERE org_uuid = ? AND uuid IN (${placeholders})`,
        )
        .all(organizationUuid, ...collectionIds)
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
    database.run("DELETE FROM collections_groups WHERE groups_uuid = ?", [groupUuid])
    for (const collection of collections) {
      database.run(
        `INSERT INTO collections_groups (
           collections_uuid, groups_uuid, read_only, hide_passwords, manage
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(collections_uuid, groups_uuid) DO UPDATE SET
           read_only = excluded.read_only,
           hide_passwords = excluded.hide_passwords,
           manage = excluded.manage`,
        [
          collection.id,
          groupUuid,
          collection.readOnly ? 1 : 0,
          collection.hidePasswords ? 1 : 0,
          collection.manage ? 1 : 0,
        ],
      )
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
