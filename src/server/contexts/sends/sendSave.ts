import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Send } from "./send.js"

export function sendSave(database: DatabaseConnection, send: Send): Result<void> {
  const op = "sendSave"
  try {
    database.run(
      `INSERT INTO sends (
        uuid, user_uuid, organization_uuid, name, notes, atype, data, key,
        password_hash, password_salt, password_iter, max_access_count, access_count,
         creation_date, revision_date, expiration_date, deletion_date, disabled, hide_email, emails
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        user_uuid = excluded.user_uuid,
        organization_uuid = excluded.organization_uuid,
        name = excluded.name,
        notes = excluded.notes,
        atype = excluded.atype,
        data = excluded.data,
        key = excluded.key,
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        password_iter = excluded.password_iter,
        max_access_count = excluded.max_access_count,
        access_count = excluded.access_count,
        creation_date = excluded.creation_date,
        revision_date = excluded.revision_date,
        expiration_date = excluded.expiration_date,
        deletion_date = excluded.deletion_date,
        disabled = excluded.disabled,
         hide_email = excluded.hide_email,
         emails = excluded.emails`,
      [
        send.uuid,
        send.userUuid,
        send.organizationUuid,
        send.name,
        send.notes,
        send.type,
        send.data,
        send.key,
        send.passwordHash,
        send.passwordSalt,
        send.passwordIterations,
        send.maxAccessCount,
        send.accessCount,
        send.creationDate,
        send.revisionDate,
        send.expirationDate,
        send.deletionDate,
        send.disabled ? 1 : 0,
        send.hideEmail === null ? null : send.hideEmail ? 1 : 0,
        send.emails,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Send save failed.")
  }
}
