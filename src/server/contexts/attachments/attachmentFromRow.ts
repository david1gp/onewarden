import type { Attachment } from "./attachment.js"
import type { AttachmentRow } from "./attachmentRow.js"

export function attachmentFromRow(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    cipherUuid: row.cipher_uuid,
    fileName: row.file_name,
    fileSize: row.file_size,
    key: row.akey,
  }
}
