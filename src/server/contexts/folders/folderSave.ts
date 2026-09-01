import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { type FolderInsert, folders } from "../../database/schema/folders.js"
import type { Folder } from "./folder.js"

export function folderSave(database: DatabaseConnection, folder: Folder): Result<void> {
  const op = "folderSave"
  try {
    const values: FolderInsert = folder
    database.drizzle
      .insert(folders)
      .values(values)
      .onConflictDoUpdate({
        target: folders.uuid,
        set: {
          createdAt: values.createdAt,
          updatedAt: values.updatedAt,
          userUuid: values.userUuid,
          name: values.name,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Folder save failed.")
  }
}
