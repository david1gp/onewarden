import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Folder } from "./folder.js"

export function folderSave(database: DatabaseConnection, folder: Folder): Result<void> {
  const op = "folderSave"
  try {
    database.run(
      `INSERT INTO folders (uuid, created_at, updated_at, user_uuid, name)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         user_uuid = excluded.user_uuid,
         name = excluded.name`,
      [folder.uuid, folder.createdAt, folder.updatedAt, folder.userUuid, folder.name],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Folder save failed.")
  }
}
