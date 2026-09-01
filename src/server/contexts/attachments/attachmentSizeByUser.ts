import { eq, sql } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { attachments } from "../../database/schema/attachments.js"
import { ciphers } from "../../database/schema/ciphers.js"

export function attachmentSizeByUser(database: DatabaseConnection, userUuid: string): Result<number> {
  const op = "attachmentSizeByUser"
  try {
    const row = database.drizzle
      .select({ size: sql<number>`coalesce(sum(${attachments.fileSize}), 0)` })
      .from(attachments)
      .innerJoin(ciphers, eq(ciphers.uuid, attachments.cipherUuid))
      .where(eq(ciphers.userUuid, userUuid))
      .get()
    const size = Number(row?.size ?? 0)
    if (!Number.isSafeInteger(size) || size < 0) return resultErrorCreate(op, "Attachment size overflow.")
    return resultCreate(size)
  } catch {
    return resultErrorCreate(op, "Attachment size lookup failed.")
  }
}
