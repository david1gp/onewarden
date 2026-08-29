import type { Result } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionRevisionUpdate } from "./organizationCollectionRevisionUpdate.js"

export function organizationCollectionDeleteInTransaction(
  database: DatabaseConnection,
  organizationUuid: string,
  collection: OrganizationCollection,
  affectedUserUuids: readonly string[],
  revisionDate: string,
): Result<void> {
  const op = "organizationCollectionDeleteInTransaction"
  try {
    database.run("DELETE FROM users_collections WHERE collection_uuid = ?", [collection.uuid])
    database.run("DELETE FROM collections_groups WHERE collections_uuid = ?", [collection.uuid])
    database.run("DELETE FROM ciphers_collections WHERE collection_uuid = ?", [collection.uuid])
    database.run("DELETE FROM collections WHERE uuid = ? AND org_uuid = ?", [collection.uuid, organizationUuid])
    return organizationCollectionRevisionUpdate(database, affectedUserUuids, revisionDate)
  } catch {
    return resultErrorCreate(op, "Collection deletion failed.")
  }
}
