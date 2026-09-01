import { and, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { sends } from "../../database/schema/sends.js"
import type { Send } from "./send.js"
import { sendFromRow } from "./sendFromRow.js"

export function sendFindByUuidAndUser(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
): Result<Send | null> {
  const op = "sendFindByUuidAndUser"
  try {
    const row = database.drizzle
      .select()
      .from(sends)
      .where(and(eq(sends.uuid, uuid), eq(sends.userUuid, userUuid)))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : sendFromRow(row))
  } catch {
    return resultErrorCreate(op, "Send lookup failed.")
  }
}
