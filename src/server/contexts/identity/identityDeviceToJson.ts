import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceCommonToJson } from "./identityDeviceCommonToJson.js"

export function identityDeviceToJson(device: IdentityDevice) {
  return {
    ...identityDeviceCommonToJson(device),
    isTrusted: false,
    object: "device" as const,
  }
}
