import type { IdentityDevice } from "../identity/identityDevice.js"
import type { CipherNotificationAdapter } from "./cipherNotificationAdapter.js"
import type { CipherUserNotification } from "./cipherUserNotification.js"

export async function cipherUserNotificationSend(
  adapter: CipherNotificationAdapter,
  type: number,
  userUuid: string,
  revisionDate: string,
  device: IdentityDevice,
): Promise<void> {
  if (adapter.sendUserUpdate === undefined) return
  const notification: CipherUserNotification = {
    contextId: device.uuid,
    payload: { Date: revisionDate, UserId: userUuid },
    type,
  }
  try {
    await adapter.sendUserUpdate(notification)
  } catch {
    return
  }
}
