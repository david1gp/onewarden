import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { Cipher } from "./cipher.js"
import { cipherAccessFindByUser } from "./cipherAccessFindByUser.js"
import { cipherDeleteDependencies } from "./cipherDeleteDependencies.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"
import { cipherSave } from "./cipherSave.js"
import { cipherRevisionUpdate } from "./cipherRevisionUpdate.js"

export function cipherDelete(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  soft: boolean,
  clock: Clock,
  groupsEnabled = false,
): Result<Cipher> {
  const cipherResult = cipherFindByUuid(database, cipherUuid)
  if (!cipherResult.success) return cipherResult
  if (cipherResult.data === null) return cipherErrorCreate("cipherDelete", "Cipher doesn't exist")
  const cipher = cipherResult.data
  const accessResult = cipherAccessFindByUser(database, cipher, userUuid, groupsEnabled)
  if (!accessResult.success) return accessResult
  if (accessResult.data === null || (accessResult.data.readOnly && !accessResult.data.manage))
    return cipherErrorCreate("cipherDelete", "Cipher can't be deleted by user")
  const now = clock.now().toISOString()
  if (soft) {
    const nextCipher = { ...cipher, deletedAt: now, updatedAt: now }
    return databaseTransaction(database, () => {
      const revisionResult = cipherRevisionUpdate(database, nextCipher, now, groupsEnabled)
      if (!revisionResult.success) return revisionResult
      const saveResult = cipherSave(database, nextCipher)
      if (!saveResult.success) return saveResult
      return resultCreate(nextCipher)
    })
  }
  const result = databaseTransaction(database, () => {
    const revisionResult = cipherRevisionUpdate(database, cipher, now, groupsEnabled)
    if (!revisionResult.success) return revisionResult
    const dependencyResult = cipherDeleteDependencies(database, cipher.uuid)
    if (!dependencyResult.success) return dependencyResult
    try {
      database.run("DELETE FROM ciphers WHERE uuid = ?", [cipher.uuid])
      return resultCreate(cipher)
    } catch {
      return cipherErrorCreate("cipherDelete", "Cipher delete failed.")
    }
  })
  return result
}
