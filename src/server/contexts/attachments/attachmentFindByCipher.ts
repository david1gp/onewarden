import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Attachment } from "./attachment.js"
import { attachmentSelect } from "./attachmentSelect.js"

export function attachmentFindByCipher(database: DatabaseConnection, cipherUuid: string): Result<Attachment[]> {
  const op = "attachmentFindByCipher"
  try {
    const rows = database
      .query<Attachment, [string]>(
        `SELECT ${attachmentSelect}
         FROM attachments WHERE cipher_uuid = ? ORDER BY id`,
      )
      .all(cipherUuid)
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Attachment lookup failed.")
  }
}
