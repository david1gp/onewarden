import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { type AttachmentInsert, attachments } from "../../database/schema/attachments.js"
import type { Attachment } from "./attachment.js"

export function attachmentSave(database: DatabaseConnection, attachment: Attachment): Result<void> {
  const op = "attachmentSave"
  try {
    const values: AttachmentInsert = {
      id: attachment.id,
      cipherUuid: attachment.cipherUuid,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      akey: attachment.key,
    }
    database.drizzle
      .insert(attachments)
      .values(values)
      .onConflictDoUpdate({
        target: attachments.id,
        set: {
          cipherUuid: values.cipherUuid,
          fileName: values.fileName,
          fileSize: values.fileSize,
          akey: values.akey,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Attachment save failed.")
  }
}
