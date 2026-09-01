import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { foldersCiphers } from "../../database/schema/foldersCiphers.js"

export function folderCipherDeleteAllByFolder(database: DatabaseConnection, folderUuid: string): Result<void> {
  const op = "folderCipherDeleteAllByFolder"
  try {
    database.drizzle.delete(foldersCiphers).where(eq(foldersCiphers.folderUuid, folderUuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Folder cipher mapping deletion failed.")
  }
}
