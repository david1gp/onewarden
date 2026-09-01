import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import type { AuthRequestRow } from "../../database/schema/authRequests.js"

export function identityAuthRequestFromRow(row: AuthRequestRow): IdentityAuthRequest {
  return {
    uuid: row.uuid,
    userUuid: row.userUuid,
    organizationUuid: row.organizationUuid,
    requestDeviceIdentifier: row.requestDeviceIdentifier,
    deviceType: row.deviceType,
    requestIp: row.requestIp,
    responseDeviceId: row.responseDeviceId,
    accessCode: row.accessCode,
    publicKey: row.publicKey,
    encKey: row.encKey,
    masterPasswordHash: row.masterPasswordHash,
    approved: row.approved,
    creationDate: row.creationDate,
    responseDate: row.responseDate,
    authenticationDate: row.authenticationDate,
  }
}
