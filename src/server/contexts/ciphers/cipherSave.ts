import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"

export function cipherSave(database: DatabaseConnection, cipher: Cipher): Result<void> {
  const op = "cipherSave"
  try {
    database.run(
      `INSERT INTO ciphers (
        uuid, created_at, updated_at, user_uuid, organization_uuid, key, atype,
        name, notes, fields, data, password_history, deleted_at, reprompt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        user_uuid = excluded.user_uuid,
        organization_uuid = excluded.organization_uuid,
        key = excluded.key,
        atype = excluded.atype,
        name = excluded.name,
        notes = excluded.notes,
        fields = excluded.fields,
        data = excluded.data,
        password_history = excluded.password_history,
        deleted_at = excluded.deleted_at,
        reprompt = excluded.reprompt`,
      [
        cipher.uuid,
        cipher.createdAt,
        cipher.updatedAt,
        cipher.userUuid,
        cipher.organizationUuid,
        cipher.key,
        cipher.type,
        cipher.name,
        cipher.notes,
        cipher.fields,
        cipher.data,
        cipher.passwordHistory,
        cipher.deletedAt,
        cipher.reprompt,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher save failed.")
  }
}
