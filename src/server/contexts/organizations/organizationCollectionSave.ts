import type { Result } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { collections } from "../../database/schema/collections.js"
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
    database.drizzle
      .insert(collections)
      .values({
        uuid: collection.uuid,
        orgUuid: collection.organizationUuid,
        name: collection.name,
        externalId: collection.externalId,
      })
      .onConflictDoUpdate({
        target: collections.uuid,
        set: { orgUuid: collection.organizationUuid, name: collection.name, externalId: collection.externalId },
      })
      .run()
    return organizationCollectionRevisionUpdate(database, affectedResult.data, revisionDate)
  } catch {
    return resultErrorCreate(op, "Collection save failed.")
  }
}
