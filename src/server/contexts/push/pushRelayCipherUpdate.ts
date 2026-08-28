import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityDevice } from "../identity/identityDevice.js"
import type { Cipher } from "../ciphers/cipher.js"
import type { cipherUpdateType } from "../ciphers/cipherUpdateType.js"
import { identityDeviceFindByUser } from "../identity/identityDeviceFindByUser.js"
import type { PushRelayAdapter } from "./pushRelayAdapter.js"

export async function pushRelayCipherUpdate(
  adapter: PushRelayAdapter,
  type: (typeof cipherUpdateType)[keyof typeof cipherUpdateType],
  cipher: Cipher,
  device: IdentityDevice,
  database: DatabaseConnection,
): Promise<void> {
  if (cipher.userUuid === null) return
  const devicesResult = identityDeviceFindByUser(database, cipher.userUuid)
  if (!devicesResult.success || !devicesResult.data.some((candidate) => candidate.pushToken !== null)) return
  try {
    await adapter.dispatch({
      userId: cipher.userUuid,
      organizationId: cipher.organizationUuid,
      deviceId: device.pushUuid,
      identifier: device.uuid,
      type,
      payload: { id: cipher.uuid, userId: cipher.userUuid, revisionDate: cipher.updatedAt },
      clientType: null,
      installationId: null,
    })
  } catch {
    return
  }
}
