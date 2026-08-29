import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { TwoFactorRecord } from "./twoFactorRecord.js"

export function twoFactorRecordSave(database: DatabaseConnection, record: TwoFactorRecord): Result<void> {
  const op = "twoFactorRecordSave"
  try {
    database.run(
      `INSERT INTO twofactor (uuid, user_uuid, atype, enabled, data, last_used)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
          user_uuid = excluded.user_uuid,
          atype = excluded.atype,
          enabled = excluded.enabled,
          data = excluded.data,
          last_used = excluded.last_used
       ON CONFLICT(user_uuid, atype) DO UPDATE SET
          enabled = excluded.enabled,
          data = excluded.data,
          last_used = excluded.last_used`,
      [record.uuid, record.userUuid, record.type, record.enabled ? 1 : 0, record.data, record.lastUsed],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Two-factor provider save failed.")
  }
}
