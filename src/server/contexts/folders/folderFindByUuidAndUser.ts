import { and, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { folders } from "../../database/schema/folders.js"
import type { Folder } from "./folder.js"

export function folderFindByUuidAndUser(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
): Result<Folder | null> {
  const op = "folderFindByUuidAndUser"
  try {
    const row = database.drizzle
      .select()
      .from(folders)
      .where(and(eq(folders.uuid, uuid), eq(folders.userUuid, userUuid)))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Folder lookup failed.")
  }
}
