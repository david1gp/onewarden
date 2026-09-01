import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq, lt, sql } from "drizzle-orm"
import { twoFactor } from "../../database/schema/twoFactor.js"
import type { TwoFactorRecord } from "./twoFactorRecord.js"
import { twoFactorRecordFromRow } from "./twoFactorRecordFromRow.js"

export function twoFactorRecordFindByUser(database: DatabaseConnection, userUuid: string): Result<TwoFactorRecord[]> {
  const op = "twoFactorRecordFindByUser"
  try {
    const rows = database.drizzle
      .select()
      .from(twoFactor)
      .where(and(eq(twoFactor.userUuid, userUuid), lt(twoFactor.atype, 1000)))
      .orderBy(sql`rowid`)
      .all()
    return resultCreate(rows.map(twoFactorRecordFromRow))
  } catch {
    return resultErrorCreate(op, "Two-factor provider lookup failed.")
  }
}
