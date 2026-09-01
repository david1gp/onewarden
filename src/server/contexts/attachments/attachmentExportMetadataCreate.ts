import type { AttachmentExportMetadata } from "../../../shared/api/attachmentExportMetadataSchema.js"
import type { Attachment } from "./attachment.js"

export function attachmentExportMetadataCreate(attachment: Attachment): AttachmentExportMetadata {
  return {
    fileName: attachment.fileName,
    id: attachment.id,
    key: attachment.key,
    object: "attachment",
    size: String(attachment.fileSize),
  }
}
