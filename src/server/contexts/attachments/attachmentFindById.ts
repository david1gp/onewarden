import { sql } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { attachments } from "../../database/schema/attachments.js"
import type { Attachment } from "./attachment.js"
import { attachmentSelect } from "./attachmentSelect.js"

export function attachmentFindById(database: DatabaseConnection, id: string): Result<Attachment | null> {
  const op = "attachmentFindById"
  try {
    const row = database.drizzle
      .select(attachmentSelect)
      .from(attachments)
      .where(sql`lower(${attachments.id}) = lower(${id})`)
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Attachment lookup failed.")
  }
}
