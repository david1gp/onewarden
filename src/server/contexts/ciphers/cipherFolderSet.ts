import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function cipherFolderSet(
  database: DatabaseConnection,
  cipherUuid: string,
  folderUuid: string | null,
): Result<void> {
  const op = "cipherFolderSet"
  try {
    database.run("DELETE FROM folders_ciphers WHERE cipher_uuid = ?", [cipherUuid])
    if (folderUuid !== null)
      database.run("INSERT INTO folders_ciphers (cipher_uuid, folder_uuid) VALUES (?, ?)", [cipherUuid, folderUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher folder update failed.")
  }
}
