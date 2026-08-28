import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function cipherFolderFindByUser(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
): Result<string | null> {
  const op = "cipherFolderFindByUser"
  try {
    const row = database
      .query<{ folder_uuid: string }, [string, string]>(
        `SELECT fc.folder_uuid FROM folders_ciphers fc
         INNER JOIN folders f ON f.uuid = fc.folder_uuid
         WHERE fc.cipher_uuid = ? AND f.user_uuid = ? LIMIT 1`,
      )
      .get(cipherUuid, userUuid)
    return resultCreate(row === null ? null : row.folder_uuid)
  } catch {
    return resultErrorCreate(op, "Cipher folder lookup failed.")
  }
}
