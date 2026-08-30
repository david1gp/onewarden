import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { AttachmentFileStorageAdapter } from "../attachments/attachmentFileStorageAdapter.js"
import { folderCipherDeleteAllByFolder } from "../folders/folderCipherDeleteAllByFolder.js"
import { folderFindByUser } from "../folders/folderFindByUser.js"
import type { Cipher } from "./cipher.js"
import { cipherDeleteDependencies } from "./cipherDeleteDependencies.js"
import { cipherFindByOrganization } from "./cipherFindByOrganization.js"
import { cipherFindOwnedByUser } from "./cipherFindOwnedByUser.js"
import { cipherRevisionUpdate } from "./cipherRevisionUpdate.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"

export async function cipherPurge(
  database: DatabaseConnection,
  userUuid: string,
  organizationUuid: string | undefined,
  clock: Clock,
  groupsEnabled = false,
  storage?: AttachmentFileStorageAdapter,
): Promise<Result<Cipher[]>> {
  const ciphersResult =
    organizationUuid === undefined
      ? cipherFindOwnedByUser(database, userUuid)
      : cipherFindByOrganization(database, organizationUuid)
  if (!ciphersResult.success) return ciphersResult
  const foldersResult = organizationUuid === undefined ? folderFindByUser(database, userUuid) : undefined
  if (foldersResult !== undefined && !foldersResult.success) return foldersResult
  if (storage !== undefined) {
    for (const cipher of ciphersResult.data) {
      const storageResult = await storage.delete(cipher.uuid)
      if (!storageResult.success) return storageResult
    }
  }
  const revisionDate = clock.now().toISOString()

  return databaseTransaction(database, () => {
    for (const cipher of ciphersResult.data) {
      const revisionResult = cipherRevisionUpdate(database, cipher, revisionDate, groupsEnabled)
      if (!revisionResult.success) return revisionResult
      const dependencyResult = cipherDeleteDependencies(database, cipher.uuid)
      if (!dependencyResult.success) return dependencyResult
      try {
        database.run("DELETE FROM ciphers WHERE uuid = ?", [cipher.uuid])
      } catch {
        return resultErrorCreate("cipherPurge", "Cipher purge failed.")
      }
    }

    if (foldersResult !== undefined) {
      for (const folder of foldersResult.data) {
        const mappingResult = folderCipherDeleteAllByFolder(database, folder.uuid)
        if (!mappingResult.success) return mappingResult
        try {
          database.run("DELETE FROM folders WHERE uuid = ? AND user_uuid = ?", [folder.uuid, userUuid])
        } catch {
          return resultErrorCreate("cipherPurge", "Folder purge failed.")
        }
      }
      const revisionResult = cipherUserRevisionUpdate(database, userUuid, revisionDate)
      if (!revisionResult.success) return revisionResult
    }

    return resultCreate(ciphersResult.data)
  })
}
