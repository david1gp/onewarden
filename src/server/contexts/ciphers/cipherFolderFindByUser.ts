import { and, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { folders } from "../../database/schema/folders.js"
import { foldersCiphers } from "../../database/schema/foldersCiphers.js"

export function cipherFolderFindByUser(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
): Result<string | null> {
  const op = "cipherFolderFindByUser"
  try {
    const row = database.drizzle
      .select({ folderUuid: foldersCiphers.folderUuid })
      .from(foldersCiphers)
      .innerJoin(folders, eq(folders.uuid, foldersCiphers.folderUuid))
      .where(and(eq(foldersCiphers.cipherUuid, cipherUuid), eq(folders.userUuid, userUuid)))
      .limit(1)
      .get()
    return resultCreate(row?.folderUuid ?? null)
  } catch {
    return resultErrorCreate(op, "Cipher folder lookup failed.")
  }
}
