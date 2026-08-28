import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { Attachment } from "./attachment.js"
import { attachmentDownloadTokenCreate } from "./attachmentDownloadTokenCreate.js"

export async function attachmentToJson(
  attachment: Attachment,
  options: { clock: Clock; origin: string; privateKey: KeyInput | undefined },
): Promise<Result<Record<string, unknown>>> {
  const tokenResult = await attachmentDownloadTokenCreate(
    attachment.cipherUuid,
    attachment.id,
    options.privateKey,
    options.origin,
    options.clock,
  )
  if (!tokenResult.success) return tokenResult
  return resultCreate({
    fileName: attachment.fileName,
    id: attachment.id,
    key: attachment.key,
    object: "attachment",
    size: String(attachment.fileSize),
    sizeName: attachmentSizeName(attachment.fileSize),
    url: `${options.origin}/attachments/${attachment.cipherUuid}/${attachment.id}?token=${tokenResult.data}`,
  })
}

function attachmentSizeName(size: number): string {
  const units = ["bytes", "KB", "MB", "GB", "TB", "PB"]
  let value = size
  let unit = 0
  while (value > 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(2)} ${units[unit]}`
}
