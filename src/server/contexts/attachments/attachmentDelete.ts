import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { attachments } from "../../database/schema/attachments.js"
import type { Attachment } from "./attachment.js"
import type { AttachmentFileStorageAdapter } from "./attachmentFileStorageAdapter.js"
import { attachmentFindById } from "./attachmentFindById.js"

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
    database.drizzle.delete(attachments).where(eq(attachments.id, attachment.id)).run()
  } catch {
    return resultErrorCreate("attachmentDelete", "Attachment delete failed.")
  }
  const storageResult = await storage.delete(attachment.cipherUuid, attachment.id)
  if (!storageResult.success) return storageResult
  return resultCreate(attachment)
}
