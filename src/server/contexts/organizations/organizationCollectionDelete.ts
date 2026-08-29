import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { organizationCollectionAffectedUserUuidsFind } from "./organizationCollectionAffectedUserUuidsFind.js"
import { organizationCollectionDeleteInTransaction } from "./organizationCollectionDeleteInTransaction.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionFindByUuidAndOrganization } from "./organizationCollectionFindByUuidAndOrganization.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"

export function organizationCollectionDelete(
  database: DatabaseConnection,
  organizationUuid: string,
  collectionUuid: string,
  revisionDate: string,
): Result<OrganizationCollection> {
  const collectionResult = organizationCollectionFindByUuidAndOrganization(database, collectionUuid, organizationUuid)
  if (!collectionResult.success) return collectionResult
  if (collectionResult.data === null)
    return organizationErrorCreate("organizationCollectionDelete", "Collection not found")
  const collection = collectionResult.data
  const affectedResult = organizationCollectionAffectedUserUuidsFind(database, organizationUuid, collection.uuid)
  if (!affectedResult.success) return affectedResult

  const deleteResult = databaseTransaction(database, () =>
    organizationCollectionDeleteInTransaction(
      database,
      organizationUuid,
      collection,
      affectedResult.data,
      revisionDate,
    ),
  )
  if (!deleteResult.success) return deleteResult
  return resultCreate(collection)
}
