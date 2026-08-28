import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"
import type { CipherData } from "./cipherDataSchema.js"
import { cipherApplyData } from "./cipherApplyData.js"

export function cipherCreate(
  database: DatabaseConnection,
  userUuid: string,
  data: CipherData,
  clock: Clock,
  identifier: Identifier,
): Result<Cipher> {
  const now = clock.now().toISOString()
  const cipher: Cipher = {
    uuid: identifier.uuid(),
    createdAt: now,
    updatedAt: now,
    userUuid,
    organizationUuid: null,
    key: null,
    type: data.type,
    name: data.name,
    notes: null,
    fields: null,
    data: "{}",
    passwordHistory: null,
    deletedAt: null,
    reprompt: null,
  }
  const result = cipherApplyData(cipher, database, userUuid, data, clock, now)
  if (!result.success) return result
  return resultCreate(result.data)
}
