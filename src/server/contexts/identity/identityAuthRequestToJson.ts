import { identityDeviceTypeName } from "./identityDeviceTypeName.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"

export function identityAuthRequestToJson(request: IdentityAuthRequest, origin: string) {
  return {
    id: request.uuid,
    publicKey: request.publicKey,
    requestDeviceType: identityDeviceTypeName(request.deviceType),
    requestIpAddress: request.requestIp,
    key: request.encKey,
    masterPasswordHash: request.masterPasswordHash,
    creationDate: request.creationDate,
    responseDate: request.responseDate,
    requestApproved: request.approved,
    origin,
    object: "auth-request" as const,
  }
}
