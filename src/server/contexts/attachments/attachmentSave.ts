import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Attachment } from "./attachment.js"

export function attachmentSave(database: DatabaseConnection, attachment: Attachment): Result<void> {
  const op = "attachmentSave"
  try {
    database.run(
      `INSERT INTO attachments (id, cipher_uuid, file_name, file_size, akey)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         cipher_uuid = excluded.cipher_uuid,
         file_name = excluded.file_name,
         file_size = excluded.file_size,
         akey = excluded.akey`,
      [attachment.id, attachment.cipherUuid, attachment.fileName, attachment.fileSize, attachment.key],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Attachment save failed.")
  }
}
