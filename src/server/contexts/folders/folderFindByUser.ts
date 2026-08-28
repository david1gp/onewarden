import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Folder } from "./folder.js"
import { folderFromRow } from "./folderFromRow.js"
import type { FolderRow } from "./folderRow.js"

export function folderFindByUser(database: DatabaseConnection, userUuid: string): Result<Folder[]> {
  const op = "folderFindByUser"
  try {
    const rows = database
      .query<FolderRow, [string]>(
        "SELECT uuid, created_at, updated_at, user_uuid, name FROM folders WHERE user_uuid = ?",
      )
      .all(userUuid)
    return resultCreate(rows.map(folderFromRow))
  } catch {
    return resultErrorCreate(op, "Folder lookup failed.")
  }
}
