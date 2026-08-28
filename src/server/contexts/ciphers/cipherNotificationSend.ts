import type { IdentityDevice } from "../identity/identityDevice.js"
import type { Cipher } from "./cipher.js"
import type { CipherNotificationAdapter } from "./cipherNotificationAdapter.js"
import type { CipherNotification } from "./cipherNotification.js"

export async function cipherNotificationSend(
  adapter: CipherNotificationAdapter,
  type: number,
  cipher: Cipher,
  device: IdentityDevice,
): Promise<void> {
  if (adapter.sendCipherUpdate === undefined) return
  const notification: CipherNotification = {
    contextId: device.uuid,
    payload: {
      CollectionIds: null,
      Id: cipher.uuid,
      OrganizationId: cipher.organizationUuid,
      RevisionDate: cipher.updatedAt,
      UserId: cipher.userUuid,
    },
    type,
  }
  try {
    await adapter.sendCipherUpdate(notification)
  } catch {
    return
  }
}
