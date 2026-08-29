import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Attachment } from "./attachment.js"
import { attachmentSelect } from "./attachmentSelect.js"

export function attachmentFindById(database: DatabaseConnection, id: string): Result<Attachment | null> {
  const op = "attachmentFindById"
  try {
    const row = database
      .query<Attachment, [string]>(
        `SELECT ${attachmentSelect}
         FROM attachments WHERE lower(id) = lower(?) LIMIT 1`,
      )
      .get(id)
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Attachment lookup failed.")
  }
}
