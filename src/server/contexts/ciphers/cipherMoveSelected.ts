import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { cipherAccessFindByUser } from "./cipherAccessFindByUser.js"
import type { Cipher } from "./cipher.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"
import { cipherMove } from "./cipherMove.js"

export function cipherMoveSelected(
  database: DatabaseConnection,
  cipherUuids: readonly string[],
  userUuid: string,
  folderUuid: string | null,
  clock: Clock,
  groupsEnabled = false,
): Result<{ moved: number; movedCipher: Cipher | undefined }> {
  const accessibleCiphers: Cipher[] = []
  for (const cipherUuid of cipherUuids) {
    const cipherResult = cipherFindByUuid(database, cipherUuid)
    if (!cipherResult.success) return cipherResult
    if (cipherResult.data === null) continue
    const accessResult = cipherAccessFindByUser(database, cipherResult.data, userUuid, groupsEnabled)
    if (!accessResult.success) return accessResult
    if (accessResult.data === null) continue
    if (!accessibleCiphers.some((cipher) => cipher.uuid === cipherResult.data?.uuid))
      accessibleCiphers.push(cipherResult.data)
  }
  if (accessibleCiphers.length !== cipherUuids.length)
    return cipherErrorCreate(
      "cipherMoveSelected",
      `Not all ciphers are moved! ${accessibleCiphers.length} of the selected ${cipherUuids.length} were moved.`,
    )

  const revisionDate = clock.now().toISOString()
  const result = databaseTransaction(database, () => {
    for (const cipher of accessibleCiphers) {
      const moveResult = cipherMove(database, cipher.uuid, userUuid, folderUuid, clock, groupsEnabled, {
        revisionDate,
        transaction: false,
      })
      if (!moveResult.success) return moveResult
    }
    return {
      success: true as const,
      data: {
        moved: accessibleCiphers.length,
        movedCipher: cipherUuids.length === 1 ? accessibleCiphers[0] : undefined,
      },
    }
  })
  return result
}
