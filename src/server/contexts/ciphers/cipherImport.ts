import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { folderFindByUser } from "../folders/folderFindByUser.js"
import { folderSave } from "../folders/folderSave.js"
import type { Cipher } from "./cipher.js"
import { cipherApplyData } from "./cipherApplyData.js"
import { cipherDataPrepare } from "./cipherDataPrepare.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import type { CipherImportData } from "./cipherImportDataSchema.js"
import { cipherPasswordHistoryValidate } from "./cipherPasswordHistoryValidate.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"

export function cipherImport(
  database: DatabaseConnection,
  userUuid: string,
  data: CipherImportData,
  clock: Clock,
  identifier: Identifier,
  maxNoteSize = 10_000,
): Result<{ revisionDate: string }> {
  for (const [cipherIndex, cipherData] of data.ciphers.entries()) {
    const preparedResult = cipherDataPrepare(cipherData)
    if (!preparedResult.success) return preparedResult
    if (preparedResult.data.organizationUuid !== null)
      return cipherErrorCreate("cipherImport", "You don't have permission to add item to organization")
    if (
      cipherData.notes !== null &&
      cipherData.notes !== undefined &&
      new TextEncoder().encode(cipherData.notes).byteLength > maxNoteSize
    )
      return apiErrorCreate("cipherImport", "platform.invalid-request", "The model state is invalid.", {
        [`Ciphers[${cipherIndex}].Notes`]: [
          `The field Notes exceeds the maximum encrypted value length of ${maxNoteSize} characters.`,
        ],
      })
    const passwordHistoryResult = cipherPasswordHistoryValidate(cipherData.passwordHistory, cipherIndex)
    if (!passwordHistoryResult.success) return passwordHistoryResult
  }

  const existingFoldersResult = folderFindByUser(database, userUuid)
  if (!existingFoldersResult.success) return existingFoldersResult
  const existingFolderIds = new Set(existingFoldersResult.data.map((folder) => folder.uuid))
  const now = clock.now().toISOString()

  return databaseTransaction(database, () => {
    const folderIds: string[] = []
    for (const folderData of data.folders) {
      const requestedFolderId =
        folderData.id === undefined || folderData.id === null || folderData.id === "" ? null : folderData.id
      if (requestedFolderId !== null && existingFolderIds.has(requestedFolderId)) {
        folderIds.push(requestedFolderId)
        continue
      }

      const folder: Parameters<typeof folderSave>[1] = {
        uuid: identifier.uuid(),
        createdAt: now,
        updatedAt: now,
        userUuid,
        name: folderData.name,
      }
      const saveResult = folderSave(database, folder)
      if (!saveResult.success) return saveResult
      folderIds.push(folder.uuid)
    }

    const relations = new Map<number, number>()
    for (const relation of data.folderRelationships) relations.set(relation.key, relation.value)

    for (const [cipherIndex, cipherData] of data.ciphers.entries()) {
      const folderIndex = relations.get(cipherIndex)
      const folderId = folderIndex === undefined ? null : (folderIds[folderIndex] ?? null)
      const cipher: Cipher = {
        uuid: identifier.uuid(),
        createdAt: now,
        updatedAt: now,
        userUuid,
        organizationUuid: null,
        key: null,
        type: cipherData.type,
        name: cipherData.name,
        notes: null,
        fields: null,
        data: "{}",
        passwordHistory: null,
        deletedAt: null,
        reprompt: null,
      }
      const applyResult = cipherApplyData(cipher, database, userUuid, { ...cipherData, folderId }, clock, {
        revisionDate: now,
        transaction: false,
        updateRevision: false,
      })
      if (!applyResult.success) return applyResult
    }

    const revisionResult = cipherUserRevisionUpdate(database, userUuid, now)
    if (!revisionResult.success) return revisionResult
    return resultCreate({ revisionDate: now })
  })
}
