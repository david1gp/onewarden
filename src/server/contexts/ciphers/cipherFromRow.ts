import type { Cipher } from "./cipher.js"
import type { CipherRow } from "./cipherRow.js"

export function cipherFromRow(row: CipherRow): Cipher {
  return {
    uuid: row.uuid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userUuid: row.user_uuid,
    organizationUuid: row.organization_uuid,
    key: row.key,
    type: row.atype,
    name: row.name,
    notes: row.notes,
    fields: row.fields,
    data: row.data,
    passwordHistory: row.password_history,
    deletedAt: row.deleted_at,
    reprompt: row.reprompt,
  }
}
