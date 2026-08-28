import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Attachment } from "./attachment.js"
import { attachmentFromRow } from "./attachmentFromRow.js"
import type { AttachmentRow } from "./attachmentRow.js"

export function attachmentFindById(database: DatabaseConnection, id: string): Result<Attachment | null> {
  const op = "attachmentFindById"
  try {
    const row = database
      .query<AttachmentRow, [string]>(
        `SELECT id, cipher_uuid, file_name, file_size, akey
         FROM attachments WHERE lower(id) = lower(?) LIMIT 1`,
      )
      .get(id)
    return resultCreate(row === null ? null : attachmentFromRow(row))
  } catch {
    return resultErrorCreate(op, "Attachment lookup failed.")
  }
}
