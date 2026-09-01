import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { type CipherInsert, ciphers } from "../../database/schema/ciphers.js"
import type { Cipher } from "./cipher.js"

export function cipherSave(database: DatabaseConnection, cipher: Cipher): Result<void> {
  const op = "cipherSave"
  try {
    const values: CipherInsert = {
      uuid: cipher.uuid,
      createdAt: cipher.createdAt,
      updatedAt: cipher.updatedAt,
      userUuid: cipher.userUuid,
      organizationUuid: cipher.organizationUuid,
      key: cipher.key,
      atype: cipher.type,
      name: cipher.name,
      notes: cipher.notes,
      fields: cipher.fields,
      data: cipher.data,
      passwordHistory: cipher.passwordHistory,
      deletedAt: cipher.deletedAt,
      reprompt: cipher.reprompt,
    }
    database.drizzle
      .insert(ciphers)
      .values(values)
      .onConflictDoUpdate({
        target: ciphers.uuid,
        set: {
          createdAt: values.createdAt,
          updatedAt: values.updatedAt,
          userUuid: values.userUuid,
          organizationUuid: values.organizationUuid,
          key: values.key,
          atype: values.atype,
          name: values.name,
          notes: values.notes,
          fields: values.fields,
          data: values.data,
          passwordHistory: values.passwordHistory,
          deletedAt: values.deletedAt,
          reprompt: values.reprompt,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher save failed.")
  }
}
