import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function folderCipherDeleteAllByFolder(database: DatabaseConnection, folderUuid: string): Result<void> {
  const op = "folderCipherDeleteAllByFolder"
  try {
    database.run("DELETE FROM folders_ciphers WHERE folder_uuid = ?", [folderUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Folder cipher mapping deletion failed.")
  }
}
