import { asc, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { sends } from "../../database/schema/sends.js"
import type { Send } from "./send.js"
import { sendFromRow } from "./sendFromRow.js"

export function sendFindByUser(database: DatabaseConnection, userUuid: string): Result<Send[]> {
  const op = "sendFindByUser"
  try {
    const rows = database.drizzle
      .select()
      .from(sends)
      .where(eq(sends.userUuid, userUuid))
      .orderBy(asc(sends.creationDate))
      .all()
    return resultCreate(rows.map(sendFromRow))
  } catch {
    return resultErrorCreate(op, "Send lookup failed.")
  }
}
