import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function attachmentSizeByUser(database: DatabaseConnection, userUuid: string): Result<number> {
  const op = "attachmentSizeByUser"
  try {
    const row = database
      .query<{ size: number | null }, [string]>(
        `SELECT COALESCE(SUM(attachment.file_size), 0) AS size
         FROM attachments AS attachment
         JOIN ciphers AS cipher ON cipher.uuid = attachment.cipher_uuid
         WHERE cipher.user_uuid = ?`,
      )
      .get(userUuid)
    const size = Number(row?.size ?? 0)
    if (!Number.isSafeInteger(size) || size < 0) return resultErrorCreate(op, "Attachment size overflow.")
    return resultCreate(size)
  } catch {
    return resultErrorCreate(op, "Attachment size lookup failed.")
  }
}
