import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { Cipher } from "./cipher.js"
import { cipherAccessFindByUser } from "./cipherAccessFindByUser.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"
import { cipherSave } from "./cipherSave.js"
import { cipherRevisionUpdate } from "./cipherRevisionUpdate.js"

export function cipherRestore(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  clock: Clock,
  groupsEnabled = false,
): Result<Cipher> {
  const cipherResult = cipherFindByUuid(database, cipherUuid)
  if (!cipherResult.success) return cipherResult
  if (cipherResult.data === null) return cipherErrorCreate("cipherRestore", "Cipher doesn't exist")
  const cipher = cipherResult.data
  const accessResult = cipherAccessFindByUser(database, cipher, userUuid, groupsEnabled)
  if (!accessResult.success) return accessResult
  if (accessResult.data === null || (accessResult.data.readOnly && !accessResult.data.manage))
    return cipherErrorCreate("cipherRestore", "Cipher can't be restored by user")
  const nextCipher = { ...cipher, deletedAt: null, updatedAt: clock.now().toISOString() }
  return databaseTransaction(database, () => {
    const revisionResult = cipherRevisionUpdate(database, nextCipher, nextCipher.updatedAt, groupsEnabled)
    if (!revisionResult.success) return revisionResult
    const saveResult = cipherSave(database, nextCipher)
    if (!saveResult.success) return saveResult
    return { success: true as const, data: nextCipher }
  })
}
