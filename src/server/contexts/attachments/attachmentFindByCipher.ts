import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Attachment } from "./attachment.js"
import { attachmentFromRow } from "./attachmentFromRow.js"
import type { AttachmentRow } from "./attachmentRow.js"

export function attachmentFindByCipher(database: DatabaseConnection, cipherUuid: string): Result<Attachment[]> {
  const op = "attachmentFindByCipher"
  try {
    const rows = database
      .query<AttachmentRow, [string]>(
        `SELECT id, cipher_uuid, file_name, file_size, akey
         FROM attachments WHERE cipher_uuid = ? ORDER BY id`,
      )
      .all(cipherUuid)
    return resultCreate(rows.map(attachmentFromRow))
  } catch {
    return resultErrorCreate(op, "Attachment lookup failed.")
  }
}
