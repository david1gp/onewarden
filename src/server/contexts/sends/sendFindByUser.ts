import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Send } from "./send.js"
import { sendFromRow } from "./sendFromRow.js"
import type { SendRow } from "./sendRow.js"

export function sendFindByUser(database: DatabaseConnection, userUuid: string): Result<Send[]> {
  const op = "sendFindByUser"
  try {
    const rows = database
      .query<SendRow, [string]>(
        `SELECT uuid, user_uuid, organization_uuid, name, notes, atype, data, key,
           password_hash, password_salt, password_iter, max_access_count, access_count,
           creation_date, revision_date, expiration_date, deletion_date, disabled, hide_email
         FROM sends WHERE user_uuid = ? ORDER BY creation_date`,
      )
      .all(userUuid)
    return resultCreate(rows.map(sendFromRow))
  } catch {
    return resultErrorCreate(op, "Send lookup failed.")
  }
}
