import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { type SendInsert, sends } from "../../database/schema/sends.js"
import type { Send } from "./send.js"

export function sendSave(database: DatabaseConnection, send: Send): Result<void> {
  const op = "sendSave"
  try {
    const values: SendInsert = {
      uuid: send.uuid,
      userUuid: send.userUuid,
      organizationUuid: send.organizationUuid,
      name: send.name,
      notes: send.notes,
      atype: send.type,
      data: send.data,
      key: send.key,
      passwordHash: send.passwordHash === null ? null : Buffer.from(send.passwordHash),
      passwordSalt: send.passwordSalt === null ? null : Buffer.from(send.passwordSalt),
      passwordIter: send.passwordIterations,
      maxAccessCount: send.maxAccessCount,
      accessCount: send.accessCount,
      creationDate: send.creationDate,
      revisionDate: send.revisionDate,
      expirationDate: send.expirationDate,
      deletionDate: send.deletionDate,
      disabled: send.disabled,
      hideEmail: send.hideEmail,
      emails: send.emails,
    }
    database.drizzle
      .insert(sends)
      .values(values)
      .onConflictDoUpdate({
        target: sends.uuid,
        set: {
          userUuid: values.userUuid,
          organizationUuid: values.organizationUuid,
          name: values.name,
          notes: values.notes,
          atype: values.atype,
          data: values.data,
          key: values.key,
          passwordHash: values.passwordHash,
          passwordSalt: values.passwordSalt,
          passwordIter: values.passwordIter,
          maxAccessCount: values.maxAccessCount,
          accessCount: values.accessCount,
          creationDate: values.creationDate,
          revisionDate: values.revisionDate,
          expirationDate: values.expirationDate,
          deletionDate: values.deletionDate,
          disabled: values.disabled,
          hideEmail: values.hideEmail,
          emails: values.emails,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Send save failed.")
  }
}
