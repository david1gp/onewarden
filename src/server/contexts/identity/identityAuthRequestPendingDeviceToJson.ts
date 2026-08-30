import type { IdentityAuthRequest } from "./identityAuthRequest.js"

export function identityAuthRequestPendingDeviceToJson(request: IdentityAuthRequest) {
  return {
    id: request.uuid,
    creationDate: request.creationDate,
  }
}
