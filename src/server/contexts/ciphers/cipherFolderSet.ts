import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { type FolderCipherInsert, foldersCiphers } from "../../database/schema/foldersCiphers.js"

export function cipherFolderSet(
  database: DatabaseConnection,
  cipherUuid: string,
  folderUuid: string | null,
): Result<void> {
  const op = "cipherFolderSet"
  try {
    database.drizzle.delete(foldersCiphers).where(eq(foldersCiphers.cipherUuid, cipherUuid)).run()
    if (folderUuid !== null) {
      const values: FolderCipherInsert = { cipherUuid, folderUuid }
      database.drizzle.insert(foldersCiphers).values(values).run()
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher folder update failed.")
  }
}
