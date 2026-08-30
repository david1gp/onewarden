import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import { identityAuthRequestPendingDeviceToJson } from "./identityAuthRequestPendingDeviceToJson.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceCommonToJson } from "./identityDeviceCommonToJson.js"

export function identityDeviceWithAuthRequestToJson(
  device: IdentityDevice,
  pendingAuthRequest: IdentityAuthRequest | null,
) {
  return {
    ...identityDeviceCommonToJson(device),
    devicePendingAuthRequest:
      pendingAuthRequest === null ? null : identityAuthRequestPendingDeviceToJson(pendingAuthRequest),
    isTrusted: false,
    encryptedPublicKey: null,
    encryptedUserKey: null,
    object: "device" as const,
  }
}
