import type { IdentityDevice } from "../../src/server/contexts/identity/identityDevice.js"

export function identityTestDeviceCreate(
  userUuid: string,
  options: {
    uuid: string
    name: string
    pushUuid: string | null
    pushToken: string | null
  },
): IdentityDevice {
  const date = "2026-08-28T00:00:00.000Z"

  return {
    uuid: options.uuid,
    createdAt: date,
    updatedAt: date,
    userUuid,
    name: options.name,
    type: 7,
    pushUuid: options.pushUuid,
    pushToken: options.pushToken,
    refreshToken: "refresh-token",
    twoFactorRemember: null,
  }
}
