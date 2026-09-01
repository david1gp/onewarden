import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { sendRecipientVerifications } from "../../database/schema/sendRecipientVerifications.js"

export function sendRecipientVerificationDelete(database: DatabaseConnection, sendUuid: string): Result<void> {
  const op = "sendRecipientVerificationDelete"
  try {
    database.drizzle.delete(sendRecipientVerifications).where(eq(sendRecipientVerifications.sendUuid, sendUuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Send recipient verification cleanup failed.")
  }
}
