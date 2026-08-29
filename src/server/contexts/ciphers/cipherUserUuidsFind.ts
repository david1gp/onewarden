import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"

export function cipherUserUuidsFind(
  database: DatabaseConnection,
  cipher: Cipher,
  groupsEnabled = false,
): Result<string[]> {
  const op = "cipherUserUuidsFind"
  if (cipher.organizationUuid === null) return resultCreate(cipher.userUuid === null ? [] : [cipher.userUuid])
  try {
    const rows = database
      .query<CipherUserUuidRow, [string, string, number, string]>(
        `SELECT DISTINCT uo.user_uuid
         FROM users_organizations AS uo
         WHERE uo.org_uuid = ? AND uo.status = 2
           AND (
             uo.access_all = 1
             OR uo.atype <= 1
             OR EXISTS (
                SELECT 1
                FROM ciphers_collections AS cc
                JOIN collections AS c ON c.uuid = cc.collection_uuid AND c.org_uuid = uo.org_uuid
                JOIN users_collections AS uc
                 ON uc.collection_uuid = cc.collection_uuid AND uc.user_uuid = uo.user_uuid
               WHERE cc.cipher_uuid = ?
             )
             OR (
               ? = 1
               AND EXISTS (
                SELECT 1
                FROM ciphers_collections AS cc
                JOIN collections AS c ON c.uuid = cc.collection_uuid AND c.org_uuid = uo.org_uuid
                JOIN groups_users AS gu ON gu.users_organizations_uuid = uo.uuid
                JOIN groups AS g ON g.uuid = gu.groups_uuid AND g.organizations_uuid = uo.org_uuid
                LEFT JOIN collections_groups AS cg ON cg.collections_uuid = cc.collection_uuid AND cg.groups_uuid = g.uuid
                WHERE cc.cipher_uuid = ?
                  AND (g.access_all = 1 OR cg.collections_uuid IS NOT NULL)
               )
             )
           )
         ORDER BY uo.user_uuid`,
      )
      .all(cipher.organizationUuid, cipher.uuid, groupsEnabled ? 1 : 0, cipher.uuid)
    return resultCreate(rows.map((row) => row.user_uuid))
  } catch {
    return resultErrorCreate(op, "Cipher user lookup failed.")
  }
}

type CipherUserUuidRow = {
  user_uuid: string
}
