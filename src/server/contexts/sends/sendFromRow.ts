import type { Send } from "./send.js"
import type { SendRow } from "./sendRow.js"

export function sendFromRow(row: SendRow): Send {
  return {
    uuid: row.uuid,
    userUuid: row.user_uuid,
    organizationUuid: row.organization_uuid,
    name: row.name,
    notes: row.notes,
    type: row.atype,
    data: row.data,
    key: row.key,
    passwordHash: row.password_hash === null ? null : new Uint8Array(row.password_hash),
    passwordSalt: row.password_salt === null ? null : new Uint8Array(row.password_salt),
    passwordIterations: row.password_iter,
    maxAccessCount: row.max_access_count,
    accessCount: row.access_count,
    creationDate: row.creation_date,
    revisionDate: row.revision_date,
    expirationDate: row.expiration_date,
    deletionDate: row.deletion_date,
    disabled: row.disabled === 1,
    hideEmail: row.hide_email === null ? null : row.hide_email === 1,
    emails: row.emails,
  }
}
