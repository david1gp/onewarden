import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function sendRecipientVerificationDelete(database: DatabaseConnection, sendUuid: string): Result<void> {
  const op = "sendRecipientVerificationDelete"
  try {
    database.run("DELETE FROM send_recipient_verifications WHERE send_uuid = ?", [sendUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Send recipient verification cleanup failed.")
  }
}
