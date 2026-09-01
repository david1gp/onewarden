import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { twoFactor } from "../../database/schema/twoFactor.js"
import type { TwoFactorRecord } from "./twoFactorRecord.js"
import { twoFactorRecordFromRow } from "./twoFactorRecordFromRow.js"

export function twoFactorRecordFindByUserAndType(
  database: DatabaseConnection,
  userUuid: string,
  type: number,
): Result<TwoFactorRecord | null> {
  const op = "twoFactorRecordFindByUserAndType"
  try {
    const row = database.drizzle
      .select()
      .from(twoFactor)
      .where(and(eq(twoFactor.userUuid, userUuid), eq(twoFactor.atype, type)))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : twoFactorRecordFromRow(row))
  } catch {
    return resultErrorCreate(op, "Two-factor provider lookup failed.")
  }
}
