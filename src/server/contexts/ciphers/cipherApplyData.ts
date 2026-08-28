import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { folderFindByUuidAndUser } from "../folders/folderFindByUuidAndUser.js"
import type { Cipher } from "./cipher.js"
import type { CipherData } from "./cipherDataSchema.js"
import { cipherDataPrepare } from "./cipherDataPrepare.js"
import { cipherArchiveSet } from "./cipherArchiveSet.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFavoriteSet } from "./cipherFavoriteSet.js"
import { cipherFolderSet } from "./cipherFolderSet.js"
import { cipherSave } from "./cipherSave.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"

function cipherDateNormalize(value: string): string | undefined {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return undefined
  return new Date(timestamp).toISOString()
}

export function cipherApplyData(
  cipher: Cipher,
  database: DatabaseConnection,
  userUuid: string,
  data: CipherData,
  clock: Clock,
  revisionDate?: string,
): Result<Cipher> {
  const preparedResult = cipherDataPrepare(data)
  if (!preparedResult.success) return preparedResult
  const prepared = preparedResult.data
  if (prepared.organizationUuid !== null)
    return cipherErrorCreate("cipherApplyData", "You don't have permission to add item to organization")
  if (prepared.folderUuid !== null) {
    const folderResult = folderFindByUuidAndUser(database, prepared.folderUuid, userUuid)
    if (!folderResult.success) return folderResult
    if (folderResult.data === null)
      return cipherErrorCreate("cipherApplyData", "Invalid folder", "Folder does not exist or belongs to another user")
  }

  const now = revisionDate ?? clock.now().toISOString()
  const nextCipher = {
    ...cipher,
    data: prepared.data,
    fields: prepared.fields,
    key: prepared.key,
    name: prepared.name,
    notes: prepared.notes,
    passwordHistory: prepared.passwordHistory,
    reprompt: prepared.reprompt,
    updatedAt: now,
    userUuid,
  }
  const result = databaseTransaction(database, () => {
    const revisionResult = cipherUserRevisionUpdate(database, userUuid, now)
    if (!revisionResult.success) return revisionResult
    const saveResult = cipherSave(database, nextCipher)
    if (!saveResult.success) return saveResult
    const folderResult = cipherFolderSet(database, nextCipher.uuid, prepared.folderUuid)
    if (!folderResult.success) return folderResult
    const favoriteResult = cipherFavoriteSet(database, nextCipher.uuid, userUuid, prepared.favorite, now)
    if (!favoriteResult.success) return favoriteResult
    const archivedAt =
      prepared.archivedDate === null || prepared.archivedDate === undefined
        ? undefined
        : cipherDateNormalize(prepared.archivedDate)
    if (archivedAt !== undefined) {
      const archiveResult = cipherArchiveSet(database, nextCipher.uuid, userUuid, archivedAt, now)
      if (!archiveResult.success) return archiveResult
    }
    return resultCreate(nextCipher)
  })
  return result
}
