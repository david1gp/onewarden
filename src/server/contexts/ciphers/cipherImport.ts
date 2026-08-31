import { type Result, type ResultErr } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import type { CipherImportResult } from "../../../shared/api/cipherImportResultSchema.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { folderSave } from "../folders/folderSave.js"
import { folderUserRevisionUpdate } from "../folders/folderUserRevisionUpdate.js"
import type { Cipher } from "./cipher.js"
import { cipherApplyData } from "./cipherApplyData.js"
import { cipherDataPrepare } from "./cipherDataPrepare.js"
import type { CipherImportData } from "./cipherImportDataSchema.js"
import { cipherPasswordHistoryValidate } from "./cipherPasswordHistoryValidate.js"
import { cipherRevisionUpdate } from "./cipherRevisionUpdate.js"

export function cipherImport(
  database: DatabaseConnection,
  userUuid: string,
  data: CipherImportData,
  clock: Clock,
  identifier: Identifier,
  maxNoteSize = 10_000,
  groupsEnabled = false,
): Result<CipherImportResult> {
  const payloadResult = cipherImportPayloadValidate(data, maxNoteSize)
  if (!payloadResult.success) return payloadResult

  const now = clock.now().toISOString()
  return databaseTransaction(database, () => {
    const folderRowsResult = cipherImportFolderRowsFind(database)
    if (!folderRowsResult.success) return folderRowsResult
    const folderOwners = new Map(folderRowsResult.data.map((row) => [row.uuid, row.userUuid]))

    const cipherIdsResult = cipherImportCipherIdsFind(database)
    if (!cipherIdsResult.success) return cipherIdsResult
    const cipherIds = cipherIdsResult.data

    const folderIds: string[] = []
    const warnings: string[] = []
    let createdFolderCount = 0
    for (const [folderIndex, folderData] of data.folders.entries()) {
      const requestedFolderId = folderData.id ?? null
      if (requestedFolderId !== null) {
        const folderOwner = folderOwners.get(requestedFolderId)
        if (folderOwner !== undefined && folderOwner !== userUuid)
          return apiErrorCreate(
            "cipherImport",
            "platform.forbidden",
            "A folder in the import does not belong to the authenticated user.",
            { [`Folders[${folderIndex}].Id`]: [`Folder '${requestedFolderId}' belongs to another user.`] },
          )
        if (folderOwner === userUuid) {
          folderIds.push(requestedFolderId)
          warnings.push(`Folder at index ${folderIndex} reused existing folder '${requestedFolderId}'.`)
          continue
        }
      }

      const folderUuid = identifier.uuid()
      if (!cipherImportIdIsSafe(folderUuid))
        return apiErrorCreate("cipherImport", "platform.internal", "The server generated an unsafe folder ID.")
      if (folderOwners.has(folderUuid))
        return apiErrorCreate(
          "cipherImport",
          "platform.conflict",
          `The server generated a folder ID that is already in use: '${folderUuid}'.`,
        )
      const folder: Parameters<typeof folderSave>[1] = {
        uuid: folderUuid,
        createdAt: now,
        updatedAt: now,
        userUuid,
        name: folderData.name,
      }
      const saveResult = folderSave(database, folder)
      if (!saveResult.success) return saveResult
      folderOwners.set(folder.uuid, userUuid)
      folderIds.push(folder.uuid)
      createdFolderCount += 1
    }

    const relations = new Map<number, number>()
    for (const relation of data.folderRelationships) relations.set(relation.key, relation.value)

    const importedCiphers: Cipher[] = []
    for (const [cipherIndex, cipherData] of data.ciphers.entries()) {
      const cipherUuid = identifier.uuid()
      if (!cipherImportIdIsSafe(cipherUuid))
        return apiErrorCreate("cipherImport", "platform.internal", "The server generated an unsafe cipher ID.")
      if (cipherIds.has(cipherUuid))
        return apiErrorCreate(
          "cipherImport",
          "platform.conflict",
          `The server generated a cipher ID that is already in use: '${cipherUuid}'.`,
        )
      cipherIds.add(cipherUuid)

      const folderIndex = relations.get(cipherIndex)
      const folderId = folderIndex === undefined ? null : folderIds[folderIndex]
      if (folderIndex !== undefined && folderId === undefined)
        return cipherImportInvalid("A cipher relationship references an unknown folder.")
      const cipher: Cipher = {
        uuid: cipherUuid,
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
        groupsEnabled,
      })
      if (!applyResult.success) return applyResult
      importedCiphers.push(applyResult.data)
    }

    for (const cipher of importedCiphers) {
      const revisionResult = cipherRevisionUpdate(database, cipher, now, groupsEnabled, userUuid)
      if (!revisionResult.success) return revisionResult
    }
    if (createdFolderCount > 0 && importedCiphers.length === 0) {
      const revisionResult = folderUserRevisionUpdate(database, userUuid, now)
      if (!revisionResult.success) return revisionResult
    }
    return resultCreate({
      importedCipherCount: importedCiphers.length,
      importedFolderCount: folderIds.length,
      revisionDate: now,
      warnings,
    })
  })
}

function cipherImportPayloadValidate(data: CipherImportData, maxNoteSize: number): Result<void> {
  const cipherIds = new Set<string>()
  const folderIds = new Set<string>()
  for (const [folderIndex, folder] of data.folders.entries()) {
    if (folder.id !== undefined && folder.id !== null) {
      if (folderIds.has(folder.id))
        return cipherImportInvalid(`Duplicate folder ID '${folder.id}'.`, `Folders[${folderIndex}].Id`)
      folderIds.add(folder.id)
    }
  }

  for (const [cipherIndex, cipherData] of data.ciphers.entries()) {
    if (cipherData.id !== undefined && cipherData.id !== null) {
      if (cipherIds.has(cipherData.id))
        return cipherImportInvalid(`Duplicate cipher ID '${cipherData.id}'.`, `Ciphers[${cipherIndex}].Id`)
      cipherIds.add(cipherData.id)
    }

    if (cipherData.folderId !== undefined && cipherData.folderId !== null)
      return cipherImportInvalid(
        "Folder assignment must be provided through folderRelationships.",
        `Ciphers[${cipherIndex}].FolderId`,
      )

    const organizationId = cipherData.organizationId ?? cipherData.organizationID ?? null
    if (
      cipherData.organizationId !== undefined &&
      cipherData.organizationID !== undefined &&
      cipherData.organizationId !== cipherData.organizationID
    )
      return cipherImportInvalid(
        "organizationId and organizationID must contain the same value.",
        `Ciphers[${cipherIndex}].OrganizationId`,
      )
    if (organizationId !== null)
      return apiErrorCreate(
        "cipherImport",
        "platform.forbidden",
        "Organization-owned ciphers cannot be imported into a personal vault.",
        { [`Ciphers[${cipherIndex}].OrganizationId`]: ["Use the organization import endpoint instead."] },
      )

    if (cipherData.attachments !== undefined && cipherData.attachments !== null)
      return cipherImportInvalid(
        "Attachments are not supported by this import path.",
        `Ciphers[${cipherIndex}].Attachments`,
      )
    if (cipherData.attachments2 !== undefined && cipherData.attachments2 !== null)
      return cipherImportInvalid(
        "Attachments are not supported by this import path.",
        `Ciphers[${cipherIndex}].Attachments2`,
      )

    const preparedResult = cipherDataPrepare(cipherData)
    if (!preparedResult.success) return preparedResult
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

  const relationshipKeys = new Set<number>()
  for (const [relationshipIndex, relation] of data.folderRelationships.entries()) {
    if (relationshipKeys.has(relation.key))
      return cipherImportInvalid(
        `Duplicate relationship for cipher index ${relation.key}.`,
        `FolderRelationships[${relationshipIndex}].Key`,
      )
    relationshipKeys.add(relation.key)
    if (relation.key >= data.ciphers.length)
      return cipherImportInvalid(
        `Cipher relationship key ${relation.key} is outside the ciphers array.`,
        `FolderRelationships[${relationshipIndex}].Key`,
      )
    if (relation.value >= data.folders.length)
      return cipherImportInvalid(
        `Folder relationship value ${relation.value} is outside the folders array.`,
        `FolderRelationships[${relationshipIndex}].Value`,
      )
  }
  return resultCreate(undefined)
}

function cipherImportInvalid(message: string, field = ""): ResultErr {
  return apiErrorCreate("cipherImport", "platform.invalid-request", "Invalid import payload.", {
    [field]: [message],
  })
}

function cipherImportIdIsSafe(value: string): boolean {
  return value.length >= 1 && value.length <= 256 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
}

function cipherImportFolderRowsFind(database: DatabaseConnection): Result<Array<{ uuid: string; userUuid: string }>> {
  const op = "cipherImportFolderRowsFind"
  try {
    const rows = database.query<{ uuid: string; user_uuid: string }, []>("SELECT uuid, user_uuid FROM folders").all()
    return resultCreate(rows.map((row) => ({ userUuid: row.user_uuid, uuid: row.uuid })))
  } catch {
    return resultErrorCreate(op, "Folder ownership lookup failed.")
  }
}

function cipherImportCipherIdsFind(database: DatabaseConnection): Result<Set<string>> {
  const op = "cipherImportCipherIdsFind"
  try {
    const rows = database.query<{ uuid: string }, []>("SELECT uuid FROM ciphers").all()
    return resultCreate(new Set(rows.map((row) => row.uuid)))
  } catch {
    return resultErrorCreate(op, "Cipher ownership lookup failed.")
  }
}
