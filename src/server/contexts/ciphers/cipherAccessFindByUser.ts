import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"

const unrestrictedCipherAccess = { hidePasswords: false, manage: true, readOnly: false } as const

export function cipherAccessFindByUser(
  database: DatabaseConnection,
  cipher: Cipher,
  userUuid: string,
  groupsEnabled = false,
): Result<{ hidePasswords: boolean; manage: boolean; readOnly: boolean } | null> {
  const op = "cipherAccessFindByUser"
  if (cipher.userUuid === userUuid) return resultCreate(unrestrictedCipherAccess)
  if (cipher.organizationUuid === null) return resultCreate(null)

  try {
    const membership = database
      .query<OrganizationMembershipAccessRow, [string, string]>(
        `SELECT uuid, access_all, atype
         FROM users_organizations
         WHERE org_uuid = ? AND user_uuid = ? AND status = 2
         LIMIT 1`,
      )
      .get(cipher.organizationUuid, userUuid)
    if (membership === null) return resultCreate(null)
    if (membership.access_all === 1 || membership.atype <= 1) return resultCreate(unrestrictedCipherAccess)

    if (groupsEnabled) {
      const fullGroup = database
        .query<{ count: number }, [string, string]>(
          `SELECT COUNT(*) AS count
           FROM groups_users AS gu
           JOIN groups AS g ON g.uuid = gu.groups_uuid AND g.organizations_uuid = ?
           WHERE gu.users_organizations_uuid = ? AND g.access_all = 1`,
        )
        .get(cipher.organizationUuid, membership.uuid)
      if ((fullGroup?.count ?? 0) > 0) return resultCreate(unrestrictedCipherAccess)
    }

    const directRows = database
      .query<CipherAccessRow, [string, string, string]>(
        `SELECT uc.read_only, uc.hide_passwords, uc.manage
         FROM ciphers_collections AS cc
         JOIN collections AS c ON c.uuid = cc.collection_uuid AND c.org_uuid = ?
         JOIN users_collections AS uc
           ON uc.collection_uuid = cc.collection_uuid AND uc.user_uuid = ?
         WHERE cc.cipher_uuid = ?`,
      )
      .all(cipher.organizationUuid, userUuid, cipher.uuid)
    const rows =
      directRows.length > 0 || !groupsEnabled ? directRows : cipherGroupAccessRowsFind(database, cipher, userUuid)
    if (rows.length === 0) return resultCreate(null)
    return resultCreate(cipherAccessAggregate(rows))
  } catch {
    return resultErrorCreate(op, "Cipher access lookup failed.")
  }
}

function cipherGroupAccessRowsFind(database: DatabaseConnection, cipher: Cipher, userUuid: string): CipherAccessRow[] {
  if (cipher.organizationUuid === null) return []
  return database
    .query<CipherAccessRow, [string, string, string]>(
      `SELECT cg.read_only, cg.hide_passwords, cg.manage
       FROM ciphers_collections AS cc
       JOIN collections AS c ON c.uuid = cc.collection_uuid AND c.org_uuid = ?
       JOIN collections_groups AS cg ON cg.collections_uuid = cc.collection_uuid
       JOIN groups_users AS gu ON gu.groups_uuid = cg.groups_uuid
       JOIN users_organizations AS uo
         ON uo.uuid = gu.users_organizations_uuid AND uo.user_uuid = ? AND uo.status = 2
       JOIN groups AS g ON g.uuid = gu.groups_uuid AND g.organizations_uuid = c.org_uuid
       WHERE cc.cipher_uuid = ?`,
    )
    .all(cipher.organizationUuid, userUuid, cipher.uuid)
}

function cipherAccessAggregate(rows: readonly CipherAccessRow[]): {
  hidePasswords: boolean
  manage: boolean
  readOnly: boolean
} {
  let readOnly = true
  let hidePasswords = true
  let manage = false
  for (const row of rows) {
    readOnly = readOnly && row.read_only === 1
    hidePasswords = hidePasswords && row.hide_passwords === 1
    manage = manage || row.manage === 1
  }
  return { hidePasswords, manage, readOnly }
}

type CipherAccessRow = {
  hide_passwords: number
  manage: number
  read_only: number
}

type OrganizationMembershipAccessRow = {
  access_all: number
  atype: number
  uuid: string
}
