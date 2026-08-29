import type { Result } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionAffectedUserUuidsFind } from "./organizationCollectionAffectedUserUuidsFind.js"
import { organizationCollectionRevisionUpdate } from "./organizationCollectionRevisionUpdate.js"

export function organizationCollectionSave(
  database: DatabaseConnection,
  collection: OrganizationCollection,
  revisionDate: string,
): Result<void> {
  const op = "organizationCollectionSave"
  const affectedResult = organizationCollectionAffectedUserUuidsFind(
    database,
    collection.organizationUuid,
    collection.uuid,
  )
  if (!affectedResult.success) return affectedResult
  try {
    database.run(
      `INSERT INTO collections (uuid, org_uuid, name, external_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         org_uuid = excluded.org_uuid,
         name = excluded.name,
         external_id = excluded.external_id`,
      [collection.uuid, collection.organizationUuid, collection.name, collection.externalId],
    )
    return organizationCollectionRevisionUpdate(database, affectedResult.data, revisionDate)
  } catch {
    return resultErrorCreate(op, "Collection save failed.")
  }
}
