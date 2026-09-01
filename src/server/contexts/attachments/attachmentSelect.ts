import { attachments } from "../../database/schema/attachments.js"

export const attachmentSelect = {
  id: attachments.id,
  cipherUuid: attachments.cipherUuid,
  fileName: attachments.fileName,
  fileSize: attachments.fileSize,
  key: attachments.akey,
}
