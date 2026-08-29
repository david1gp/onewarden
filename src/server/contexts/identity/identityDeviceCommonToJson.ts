import type { IdentityDevice } from "./identityDevice.js"

type IdentityDeviceCommonJson = {
  id: string
  name: string
  type: number
  identifier: string
  creationDate: string
}

export function identityDeviceCommonToJson(device: IdentityDevice): IdentityDeviceCommonJson {
  return {
    id: device.uuid,
    name: device.name,
    type: device.type,
    identifier: device.uuid,
    creationDate: device.createdAt,
  }
}
