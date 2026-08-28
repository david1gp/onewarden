import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityDevice } from "../identity/identityDevice.js"
import { identityDeviceFindByUser } from "../identity/identityDeviceFindByUser.js"
import type { Send } from "../sends/send.js"
import type { sendUpdateType } from "../sends/sendUpdateType.js"
import type { PushRelayAdapter } from "./pushRelayAdapter.js"

export async function pushRelaySendUpdate(
  adapter: PushRelayAdapter,
  type: (typeof sendUpdateType)[keyof typeof sendUpdateType],
  send: Send,
  device: IdentityDevice,
  database: DatabaseConnection,
): Promise<void> {
  if (send.userUuid === null) return
  const devicesResult = identityDeviceFindByUser(database, send.userUuid)
  if (!devicesResult.success || !devicesResult.data.some((candidate) => candidate.pushToken !== null)) return
  try {
    await adapter.dispatch({
      userId: send.userUuid,
      organizationId: send.organizationUuid,
      deviceId: device.pushUuid,
      identifier: device.uuid,
      type,
      payload: { id: send.uuid, userId: send.userUuid, revisionDate: send.revisionDate },
      clientType: null,
      installationId: null,
    })
  } catch {
    return
  }
}
