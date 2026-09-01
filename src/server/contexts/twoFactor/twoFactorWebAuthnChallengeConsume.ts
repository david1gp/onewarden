import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactor } from "../../database/schema/twoFactor.js"
import type { TwoFactorRecord } from "./twoFactorRecord.js"
import { twoFactorRecordFromRow } from "./twoFactorRecordFromRow.js"
import { and, eq } from "drizzle-orm"

export function twoFactorWebAuthnChallengeConsume(
  database: DatabaseConnection,
  userUuid: string,
  type: number,
): Result<TwoFactorRecord | null> {
  const op = "twoFactorWebAuthnChallengeConsume"
  try {
    let challenge: TwoFactorRecord | null = null
    database.drizzle.transaction((transaction) => {
      const row = transaction
        .select()
        .from(twoFactor)
        .where(and(eq(twoFactor.userUuid, userUuid), eq(twoFactor.atype, type)))
        .limit(1)
        .get()
      if (row === undefined) return
      transaction.delete(twoFactor).where(eq(twoFactor.uuid, row.uuid)).run()
      challenge = twoFactorRecordFromRow(row)
    })
    return resultCreate(challenge)
  } catch {
    return resultErrorCreate(op, "Webauthn challenge consume failed.")
  }
}
