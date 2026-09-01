import type { Result } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { ciphersCollections } from "../../database/schema/ciphersCollections.js"
import { collections } from "../../database/schema/collections.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
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
    database.drizzle.delete(usersCollections).where(eq(usersCollections.collectionUuid, collection.uuid)).run()
    database.drizzle.delete(collectionsGroups).where(eq(collectionsGroups.collectionsUuid, collection.uuid)).run()
    database.drizzle.delete(ciphersCollections).where(eq(ciphersCollections.collectionUuid, collection.uuid)).run()
    database.drizzle
      .delete(collections)
      .where(and(eq(collections.uuid, collection.uuid), eq(collections.orgUuid, organizationUuid)))
      .run()
    return organizationCollectionRevisionUpdate(database, affectedUserUuids, revisionDate)
  } catch {
    return resultErrorCreate(op, "Collection deletion failed.")
  }
}
