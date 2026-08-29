import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Folder } from "./folder.js"
import { folderSelect } from "./folderSelect.js"

export function folderFindByUuidAndUser(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
): Result<Folder | null> {
  const op = "folderFindByUuidAndUser"
  try {
    const row = database
      .query<Folder, [string, string]>(`SELECT ${folderSelect} FROM folders WHERE uuid = ? AND user_uuid = ? LIMIT 1`)
      .get(uuid, userUuid)
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Folder lookup failed.")
  }
}
