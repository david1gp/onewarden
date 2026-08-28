import type { IdentityDevice } from "./identityDevice.js"

export function identityDeviceIsMobile(device: IdentityDevice): boolean {
  return device.type === 0 || device.type === 1
}
