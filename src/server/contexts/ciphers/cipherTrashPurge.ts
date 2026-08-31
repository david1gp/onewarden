import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { AttachmentFileStorageAdapter } from "../attachments/attachmentFileStorageAdapter.js"
import type { Cipher } from "./cipher.js"
import { cipherDeleteDependencies } from "./cipherDeleteDependencies.js"
import { cipherRevisionUpdate } from "./cipherRevisionUpdate.js"
import { cipherSelect } from "./cipherSelect.js"

const CIPHER_TRASH_RETENTION_DAYS = 30
const CIPHER_TRASH_PURGE_BATCH_SIZE = 100
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000

export async function cipherTrashPurge(
  database: DatabaseConnection,
  clock: Clock,
  storage: AttachmentFileStorageAdapter,
): Promise<Result<number>> {
  const op = "cipherTrashPurge"
  const now = clock.now().getTime()
  if (!Number.isFinite(now)) return resultErrorCreate(op, "Trash purge time is invalid.")
  const cutoff = new Date(now - CIPHER_TRASH_RETENTION_DAYS * MILLISECONDS_PER_DAY)
  if (Number.isNaN(cutoff.getTime())) return resultErrorCreate(op, "Trash purge time is invalid.")
  const cutoffDate = cutoff.toISOString()

  let ciphers: Cipher[]
  try {
    ciphers = database
      .query<Cipher, [string, number]>(
        `SELECT ${cipherSelect}
         FROM ciphers
         WHERE deleted_at < ?
         ORDER BY deleted_at, uuid
         LIMIT ?`,
      )
      .all(cutoffDate, CIPHER_TRASH_PURGE_BATCH_SIZE)
  } catch {
    return resultErrorCreate(op, "Trash purge lookup failed.")
  }

  const revisionDate = new Date(now).toISOString()
  let deleted = 0
  let failed = false
  for (const cipher of ciphers) {
    const result = await cipherTrashPurgeOne(database, cipher, cutoffDate, revisionDate, storage)
    if (!result.success) {
      failed = true
      continue
    }
    if (result.data) deleted += 1
  }
  if (failed) return resultErrorCreate(op, "Trash purge partially failed.")
  return resultCreate(deleted)
}

async function cipherTrashPurgeOne(
  database: DatabaseConnection,
  cipher: Cipher,
  cutoff: string,
  revisionDate: string,
  storage: AttachmentFileStorageAdapter,
): Promise<Result<boolean>> {
  let storageResult: Result<void>
  try {
    storageResult = await storage.delete(cipher.uuid)
  } catch {
    return resultErrorCreate("cipherTrashPurge", "Trash attachment deletion failed.")
  }
  if (!storageResult.success) return storageResult

  return databaseTransaction(database, () => {
    let current: Cipher | null
    try {
      current = database
        .query<Cipher, [string]>(`SELECT ${cipherSelect} FROM ciphers WHERE uuid = ? LIMIT 1`)
        .get(cipher.uuid)
    } catch {
      return resultErrorCreate("cipherTrashPurge", "Trash cipher lookup failed.")
    }
    if (current === null || current.deletedAt === null || current.deletedAt >= cutoff) return resultCreate(false)

    // Maintenance must invalidate every organization member, including group access.
    const revisionResult = cipherRevisionUpdate(database, current, revisionDate, true)
    if (!revisionResult.success) return revisionResult
    const dependencyResult = cipherDeleteDependencies(database, cipher.uuid)
    if (!dependencyResult.success) return dependencyResult
    try {
      database.run("DELETE FROM ciphers WHERE uuid = ?", [cipher.uuid])
      return resultCreate(true)
    } catch {
      return resultErrorCreate("cipherTrashPurge", "Trash cipher deletion failed.")
    }
  })
}
