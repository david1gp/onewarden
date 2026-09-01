import type { TwoFactorRecord } from "./twoFactorRecord.js"
import type { TwoFactorRow } from "../../database/schema/twoFactor.js"

export function twoFactorRecordFromRow(row: TwoFactorRow): TwoFactorRecord {
  return {
    uuid: row.uuid,
    userUuid: row.userUuid,
    type: row.atype,
    enabled: row.enabled,
    data: row.data,
    lastUsed: row.lastUsed,
  }
}
