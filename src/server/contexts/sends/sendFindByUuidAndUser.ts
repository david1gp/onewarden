import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Send } from "./send.js"
import { sendFromRow } from "./sendFromRow.js"
import type { SendRow } from "./sendRow.js"

export function sendFindByUuidAndUser(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
): Result<Send | null> {
  const op = "sendFindByUuidAndUser"
  try {
    const row = database
      .query<SendRow, [string, string]>(
        `SELECT uuid, user_uuid, organization_uuid, name, notes, atype, data, key,
           password_hash, password_salt, password_iter, max_access_count, access_count,
           creation_date, revision_date, expiration_date, deletion_date, disabled, hide_email, emails
         FROM sends WHERE uuid = ? AND user_uuid = ? LIMIT 1`,
      )
      .get(uuid, userUuid)
    return resultCreate(row === null ? null : sendFromRow(row))
  } catch {
    return resultErrorCreate(op, "Send lookup failed.")
  }
}
