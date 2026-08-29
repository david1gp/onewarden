import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { TwoFactorRecord } from "./twoFactorRecord.js"
import type { TwoFactorRecordRow } from "./twoFactorRecordRow.js"
import { twoFactorRecordFromRow } from "./twoFactorRecordFromRow.js"

export function twoFactorRecordFindByUser(database: DatabaseConnection, userUuid: string): Result<TwoFactorRecord[]> {
  const op = "twoFactorRecordFindByUser"
  try {
    const rows = database
      .query<TwoFactorRecordRow, [string]>(
        `SELECT uuid, user_uuid, atype, enabled, data, last_used
         FROM twofactor WHERE user_uuid = ? AND atype < 1000 ORDER BY rowid`,
      )
      .all(userUuid)
    return resultCreate(rows.map(twoFactorRecordFromRow))
  } catch {
    return resultErrorCreate(op, "Two-factor provider lookup failed.")
  }
}
