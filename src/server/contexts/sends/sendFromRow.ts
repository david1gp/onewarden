import type { SendRow } from "../../database/schema/sends.js"
import type { Send } from "./send.js"

export function sendFromRow(row: SendRow): Send {
  return {
    uuid: row.uuid,
    userUuid: row.userUuid,
    organizationUuid: row.organizationUuid,
    name: row.name,
    notes: row.notes,
    type: row.atype,
    data: row.data,
    key: row.key,
    passwordHash: row.passwordHash === null ? null : new Uint8Array(row.passwordHash),
    passwordSalt: row.passwordSalt === null ? null : new Uint8Array(row.passwordSalt),
    passwordIterations: row.passwordIter,
    maxAccessCount: row.maxAccessCount,
    accessCount: row.accessCount,
    creationDate: row.creationDate,
    revisionDate: row.revisionDate,
    expirationDate: row.expirationDate,
    deletionDate: row.deletionDate,
    disabled: row.disabled,
    hideEmail: row.hideEmail,
    emails: row.emails,
  }
}
