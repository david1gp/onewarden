import type { IdentityDevice } from "./identityDevice.js"

export function identityDeviceToJson(device: IdentityDevice) {
  return {
    id: device.uuid,
    name: device.name,
    type: device.type,
    identifier: device.uuid,
    creationDate: device.createdAt,
    isTrusted: false,
    object: "device" as const,
  }
}
