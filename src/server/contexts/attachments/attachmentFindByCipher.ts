import { asc, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { attachments } from "../../database/schema/attachments.js"
import type { Attachment } from "./attachment.js"
import { attachmentSelect } from "./attachmentSelect.js"

export function attachmentFindByCipher(database: DatabaseConnection, cipherUuid: string): Result<Attachment[]> {
  const op = "attachmentFindByCipher"
  try {
    const rows = database.drizzle
      .select(attachmentSelect)
      .from(attachments)
      .where(eq(attachments.cipherUuid, cipherUuid))
      .orderBy(asc(attachments.id))
      .all()
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Attachment lookup failed.")
  }
}
