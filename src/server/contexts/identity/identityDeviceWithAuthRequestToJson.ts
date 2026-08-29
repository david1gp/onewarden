import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceCommonToJson } from "./identityDeviceCommonToJson.js"

export function identityDeviceWithAuthRequestToJson(device: IdentityDevice) {
  return {
    ...identityDeviceCommonToJson(device),
    devicePendingAuthRequest: null,
    isTrusted: false,
    encryptedPublicKey: null,
    encryptedUserKey: null,
    object: "device" as const,
  }
}
