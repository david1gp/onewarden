import type { IdentityDevice } from "./identityDevice.js"
import type { IdentityDeviceRow } from "./identityDeviceRow.js"

export function identityDeviceFromRow(row: IdentityDeviceRow): IdentityDevice {
  return {
    uuid: row.uuid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userUuid: row.user_uuid,
    name: row.name,
    type: row.atype,
    pushUuid: row.push_uuid,
    pushToken: row.push_token,
    refreshToken: row.refresh_token,
    twoFactorRemember: row.twofactor_remember,
  }
}
