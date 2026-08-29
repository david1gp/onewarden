import type { TwoFactorRecord } from "./twoFactorRecord.js"
import type { TwoFactorRecordRow } from "./twoFactorRecordRow.js"

export function twoFactorRecordFromRow(row: TwoFactorRecordRow): TwoFactorRecord {
  return {
    uuid: row.uuid,
    userUuid: row.user_uuid,
    type: row.atype,
    enabled: row.enabled === 1,
    data: row.data,
    lastUsed: row.last_used,
  }
}
