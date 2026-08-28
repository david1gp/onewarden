import type { IdentityDevice } from "./identityDevice.js"

export function identityDeviceWithAuthRequestToJson(device: IdentityDevice) {
  return {
    id: device.uuid,
    name: device.name,
    type: device.type,
    identifier: device.uuid,
    creationDate: device.createdAt,
    devicePendingAuthRequest: null,
    isTrusted: false,
    encryptedPublicKey: null,
    encryptedUserKey: null,
    object: "device" as const,
  }
}
