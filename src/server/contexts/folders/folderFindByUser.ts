import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { folders } from "../../database/schema/folders.js"
import type { Folder } from "./folder.js"

export function folderFindByUser(database: DatabaseConnection, userUuid: string): Result<Folder[]> {
  const op = "folderFindByUser"
  try {
    const rows: Folder[] = database.drizzle.select().from(folders).where(eq(folders.userUuid, userUuid)).all()
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Folder lookup failed.")
  }
}
