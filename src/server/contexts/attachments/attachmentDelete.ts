import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Attachment } from "./attachment.js"
import { attachmentFindById } from "./attachmentFindById.js"
import type { AttachmentFileStorageAdapter } from "./attachmentFileStorageAdapter.js"

export async function attachmentDelete(
  database: DatabaseConnection,
  attachmentId: string,
  storage: AttachmentFileStorageAdapter,
): Promise<Result<Attachment>> {
  const attachmentResult = attachmentFindById(database, attachmentId)
  if (!attachmentResult.success) return attachmentResult
  if (attachmentResult.data === null) return resultErrorCreate("attachmentDelete", "Attachment doesn't exist")
  const attachment = attachmentResult.data
  try {
    database.run("DELETE FROM attachments WHERE id = ?", [attachment.id])
  } catch {
    return resultErrorCreate("attachmentDelete", "Attachment delete failed.")
  }
  const storageResult = await storage.delete(attachment.cipherUuid, attachment.id)
  if (!storageResult.success) return storageResult
  return resultCreate(attachment)
}
