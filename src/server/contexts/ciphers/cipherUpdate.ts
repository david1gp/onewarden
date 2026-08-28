import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"
import type { CipherData } from "./cipherDataSchema.js"
import { cipherApplyData } from "./cipherApplyData.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"

function cipherRevisionIsStale(cipher: Cipher, revisionDate: string | null | undefined): boolean {
  if (revisionDate === undefined || revisionDate === null) return false
  const clientTimestamp = Date.parse(revisionDate)
  const serverTimestamp = Date.parse(cipher.updatedAt)
  if (!Number.isFinite(clientTimestamp) || !Number.isFinite(serverTimestamp)) return false
  return serverTimestamp - clientTimestamp > 1000
}

export function cipherUpdate(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  data: CipherData,
  clock: Clock,
): Result<Cipher> {
  const cipherResult = cipherFindByUuid(database, cipherUuid)
  if (!cipherResult.success) return cipherResult
  if (cipherResult.data === null) return cipherErrorCreate("cipherUpdate", "Cipher doesn't exist")
  const cipher = cipherResult.data
  if (cipher.userUuid !== userUuid) return cipherErrorCreate("cipherUpdate", "Cipher is not write accessible")
  if (cipherRevisionIsStale(cipher, data.lastKnownRevisionDate))
    return cipherErrorCreate(
      "cipherUpdate",
      "The client copy of this cipher is out of date. Resync the client and try again.",
    )
  return cipherApplyData(cipher, database, userUuid, data, clock)
}
