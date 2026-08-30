import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import type { IdentityAuthRequestRow } from "./identityAuthRequestRow.js"

export function identityAuthRequestFromRow(row: IdentityAuthRequestRow): IdentityAuthRequest {
  return {
    uuid: row.uuid,
    userUuid: row.user_uuid,
    organizationUuid: row.organization_uuid,
    requestDeviceIdentifier: row.request_device_identifier,
    deviceType: row.device_type,
    requestIp: row.request_ip,
    responseDeviceId: row.response_device_id,
    accessCode: row.access_code,
    publicKey: row.public_key,
    encKey: row.enc_key,
    masterPasswordHash: row.master_password_hash,
    approved: row.approved === null ? null : row.approved === 1,
    creationDate: row.creation_date,
    responseDate: row.response_date,
    authenticationDate: row.authentication_date,
  }
}
