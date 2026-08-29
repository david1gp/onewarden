import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { TwoFactorRecord } from "./twoFactorRecord.js"
import type { TwoFactorRecordRow } from "./twoFactorRecordRow.js"
import { twoFactorRecordFromRow } from "./twoFactorRecordFromRow.js"

export function twoFactorWebAuthnChallengeConsume(
  database: DatabaseConnection,
  userUuid: string,
  type: number,
): Result<TwoFactorRecord | null> {
  const op = "twoFactorWebAuthnChallengeConsume"
  try {
    let challenge: TwoFactorRecord | null = null
    const transaction = database.transaction(() => {
      const row = database
        .query<TwoFactorRecordRow, [string, number]>(
          "SELECT uuid, user_uuid, atype, enabled, data, last_used FROM twofactor WHERE user_uuid = ? AND atype = ? LIMIT 1",
        )
        .get(userUuid, type)
      if (row === null) return
      database.run("DELETE FROM twofactor WHERE uuid = ?", [row.uuid])
      challenge = twoFactorRecordFromRow(row)
    })
    transaction()
    return resultCreate(challenge)
  } catch {
    return resultErrorCreate(op, "Webauthn challenge consume failed.")
  }
}
