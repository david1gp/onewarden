import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactor, type TwoFactorInsert } from "../../database/schema/twoFactor.js"
import type { TwoFactorRecord } from "./twoFactorRecord.js"

export function twoFactorRecordSave(database: DatabaseConnection, record: TwoFactorRecord): Result<void> {
  const op = "twoFactorRecordSave"
  try {
    const values: TwoFactorInsert = {
      uuid: record.uuid,
      userUuid: record.userUuid,
      atype: record.type,
      enabled: record.enabled,
      data: record.data,
      lastUsed: record.lastUsed,
    }
    database.drizzle
      .insert(twoFactor)
      .values(values)
      .onConflictDoUpdate({
        target: twoFactor.uuid,
        set: {
          userUuid: values.userUuid,
          atype: values.atype,
          enabled: values.enabled,
          data: values.data,
          lastUsed: values.lastUsed,
        },
      })
      .onConflictDoUpdate({
        target: [twoFactor.userUuid, twoFactor.atype],
        set: {
          enabled: values.enabled,
          data: values.data,
          lastUsed: values.lastUsed,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Two-factor provider save failed.")
  }
}
