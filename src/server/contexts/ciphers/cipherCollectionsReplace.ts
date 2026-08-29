import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { organizationCollectionFindByUuidAndOrganization } from "../organizations/organizationCollectionFindByUuidAndOrganization.js"
import { organizationCollectionWritableByUser } from "../organizations/organizationCollectionWritableByUser.js"
import { cipherAccessFindByUser } from "./cipherAccessFindByUser.js"
import type { Cipher } from "./cipher.js"
import { cipherCollectionIdsFindByUser } from "./cipherCollectionIdsFindByUser.js"
import { cipherCollectionLinkDelete } from "./cipherCollectionLinkDelete.js"
import { cipherCollectionLinkSave } from "./cipherCollectionLinkSave.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"
import { cipherUserUuidsFind } from "./cipherUserUuidsFind.js"

export function cipherCollectionsReplace(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  collectionIds: readonly string[],
  clock: Clock,
  groupsEnabled = false,
  adminCollections = false,
): Result<{ cipher: Cipher; collectionIds: string[]; userUuids: string[] }> {
  const cipherResult = cipherFindByUuid(database, cipherUuid)
  if (!cipherResult.success) return cipherResult
  if (cipherResult.data === null) return cipherErrorCreate("cipherCollectionsReplace", "Cipher doesn't exist")
  const cipher = cipherResult.data

  const accessResult = cipherAccessFindByUser(database, cipher, userUuid, groupsEnabled)
  if (!accessResult.success) return accessResult
  if (accessResult.data === null) return cipherErrorCreate("cipherCollectionsReplace", "Collection cannot be changed")
  if ((accessResult.data.readOnly || accessResult.data.hidePasswords) && !accessResult.data.manage)
    return cipherErrorCreate("cipherCollectionsReplace", "Collection cannot be changed")
  if (cipher.organizationUuid === null)
    return cipherErrorCreate("cipherCollectionsReplace", "Cipher is not owned by an organization")

  const currentResult = cipherCollectionIdsFindByUser(database, cipher, userUuid, groupsEnabled, adminCollections)
  if (!currentResult.success) return currentResult
  const postedIds = [...new Set(collectionIds)]
  const currentIds = new Set(currentResult.data)
  const posted = new Set(postedIds)
  const changedIds = [...new Set([...posted, ...currentIds])].filter(
    (collectionUuid) => posted.has(collectionUuid) !== currentIds.has(collectionUuid),
  )

  for (const collectionUuid of changedIds) {
    const collectionResult = organizationCollectionFindByUuidAndOrganization(
      database,
      collectionUuid,
      cipher.organizationUuid,
    )
    if (!collectionResult.success) return collectionResult
    if (collectionResult.data === null)
      return cipherErrorCreate("cipherCollectionsReplace", "Invalid collection ID provided")
    const writableResult = organizationCollectionWritableByUser(
      database,
      collectionUuid,
      userUuid,
      cipher.organizationUuid,
      groupsEnabled,
    )
    if (!writableResult.success) return writableResult
    if (!writableResult.data) return cipherErrorCreate("cipherCollectionsReplace", "No rights to modify the collection")
  }

  const beforeUsersResult = cipherUserUuidsFind(database, cipher, groupsEnabled)
  if (!beforeUsersResult.success) return beforeUsersResult
  const revisionDate = clock.now().toISOString()
  const result = databaseTransaction(database, () => {
    for (const collectionUuid of changedIds) {
      const linkResult = posted.has(collectionUuid)
        ? cipherCollectionLinkSave(database, cipher.uuid, collectionUuid)
        : cipherCollectionLinkDelete(database, cipher.uuid, collectionUuid)
      if (!linkResult.success) return linkResult
    }
    const afterUsersResult = cipherUserUuidsFind(database, cipher, groupsEnabled)
    if (!afterUsersResult.success) return afterUsersResult
    const userUuids = [...new Set([...beforeUsersResult.data, ...afterUsersResult.data])]
    for (const affectedUserUuid of userUuids) {
      const revisionResult = cipherUserRevisionUpdate(database, affectedUserUuid, revisionDate)
      if (!revisionResult.success) return revisionResult
    }
    return resultCreate({ cipher, collectionIds: postedIds, userUuids })
  })
  return result
}
