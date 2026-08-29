import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Folder } from "./folder.js"
import { folderSelect } from "./folderSelect.js"

export function folderFindByUser(database: DatabaseConnection, userUuid: string): Result<Folder[]> {
  const op = "folderFindByUser"
  try {
    const rows = database
      .query<Folder, [string]>(`SELECT ${folderSelect} FROM folders WHERE user_uuid = ?`)
      .all(userUuid)
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Folder lookup failed.")
  }
}
