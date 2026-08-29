import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"
import { cipherSelect } from "./cipherSelect.js"

export function cipherFindByUser(
  database: DatabaseConnection,
  userUuid: string,
  groupsEnabled = false,
): Result<Cipher[]> {
  const op = "cipherFindByUser"
  try {
    const groupAccess = groupsEnabled
      ? `
                  OR EXISTS (
                    SELECT 1
                    FROM ciphers_collections AS cc
                    JOIN collections AS c2 ON c2.uuid = cc.collection_uuid AND c2.org_uuid = uo.org_uuid
                    JOIN groups_users AS gu ON gu.users_organizations_uuid = uo.uuid
                    JOIN groups AS g ON g.uuid = gu.groups_uuid AND g.organizations_uuid = uo.org_uuid
                    LEFT JOIN collections_groups AS cg ON cg.groups_uuid = g.uuid AND cg.collections_uuid = cc.collection_uuid
                    WHERE cc.cipher_uuid = c.uuid
                      AND (g.access_all = 1 OR cg.collections_uuid IS NOT NULL)
                  )`
      : ""
    const rows = database
      .query<Cipher, [string, string]>(
        `SELECT ${cipherSelect}
         FROM ciphers AS c
         WHERE c.user_uuid = ?
            OR EXISTS (
              SELECT 1
              FROM users_organizations AS uo
              WHERE uo.user_uuid = ? AND uo.org_uuid = c.organization_uuid AND uo.status = 2
                AND (
                  uo.access_all = 1
                  OR uo.atype <= 1
                  OR EXISTS (
                    SELECT 1
                    FROM ciphers_collections AS cc
                    JOIN collections AS c2 ON c2.uuid = cc.collection_uuid AND c2.org_uuid = uo.org_uuid
                    JOIN users_collections AS uc
                      ON uc.collection_uuid = cc.collection_uuid AND uc.user_uuid = uo.user_uuid
                    WHERE cc.cipher_uuid = c.uuid
                  )
                  ${groupAccess}
                )
            )
         ORDER BY c.created_at, c.uuid`,
      )
      .all(userUuid, userUuid)
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Cipher lookup failed.")
  }
}
