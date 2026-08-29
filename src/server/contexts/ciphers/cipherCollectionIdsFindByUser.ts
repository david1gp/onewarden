import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"

export function cipherCollectionIdsFindByUser(
  database: DatabaseConnection,
  cipher: Cipher,
  userUuid: string,
  groupsEnabled = false,
  adminCollections = false,
): Result<string[]> {
  const op = "cipherCollectionIdsFindByUser"
  if (cipher.organizationUuid === null) return resultCreate([])
  try {
    const rows = database
      .query<CipherCollectionIdRow, [string, string, string, string, number, number]>(
        `SELECT DISTINCT cc.collection_uuid
         FROM ciphers_collections AS cc
         JOIN collections AS c ON c.uuid = cc.collection_uuid AND c.org_uuid = ?
         JOIN users_organizations AS uo
           ON uo.org_uuid = c.org_uuid AND uo.user_uuid = ? AND uo.status = 2
         LEFT JOIN users_collections AS uc
           ON uc.collection_uuid = cc.collection_uuid AND uc.user_uuid = ?
         WHERE cc.cipher_uuid = ?
           AND (
             uo.access_all = 1
             OR (? = 1 AND uo.atype <= 1)
             OR (uc.user_uuid IS NOT NULL AND uc.read_only = 0)
             OR (
               ? = 1
               AND EXISTS (
                 SELECT 1
                 FROM groups_users AS gu
                 JOIN groups AS g ON g.uuid = gu.groups_uuid AND g.organizations_uuid = c.org_uuid
                 LEFT JOIN collections_groups AS cg
                   ON cg.groups_uuid = g.uuid AND cg.collections_uuid = cc.collection_uuid
                 WHERE gu.users_organizations_uuid = uo.uuid
                   AND (g.access_all = 1 OR (cg.collections_uuid IS NOT NULL AND cg.read_only = 0))
               )
             )
           )
         ORDER BY cc.collection_uuid`,
      )
      .all(cipher.organizationUuid, userUuid, userUuid, cipher.uuid, adminCollections ? 1 : 0, groupsEnabled ? 1 : 0)
    return resultCreate(rows.map((row) => row.collection_uuid))
  } catch {
    return resultErrorCreate(op, "Cipher collection lookup failed.")
  }
}

type CipherCollectionIdRow = {
  collection_uuid: string
}
