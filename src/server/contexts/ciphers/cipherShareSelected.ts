import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherShare } from "./cipherShare.js"
import type { CipherData } from "./cipherDataSchema.js"

export function cipherShareSelected(
  database: DatabaseConnection,
  ciphers: readonly CipherData[],
  collectionIds: readonly string[],
  userUuid: string,
  clock: Clock,
  groupsEnabled = false,
): Result<void> {
  if (ciphers.length === 0) return cipherErrorCreate("cipherShareSelected", "You must select at least one cipher.")
  if (collectionIds.length === 0)
    return cipherErrorCreate("cipherShareSelected", "You must select at least one collection.")

  const revisionDate = clock.now().toISOString()
  return databaseTransaction(database, () => {
    for (const cipherData of ciphers.toReversed()) {
      if (cipherData.id === undefined || cipherData.id === null)
        return cipherErrorCreate("cipherShareSelected", "Request missing ids field")
      const shareResult = cipherShare(
        database,
        cipherData.id,
        userUuid,
        cipherData,
        collectionIds,
        clock,
        groupsEnabled,
        { checkRevision: false, revisionDate, transaction: false },
      )
      if (!shareResult.success) return shareResult
    }
    return { success: true as const, data: undefined }
  })
}
