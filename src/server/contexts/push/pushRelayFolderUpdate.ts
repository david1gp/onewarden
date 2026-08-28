import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityDevice } from "../identity/identityDevice.js"
import { identityDeviceFindByUser } from "../identity/identityDeviceFindByUser.js"
import type { Folder } from "../folders/folder.js"
import type { folderUpdateType } from "../folders/folderUpdateType.js"
import type { PushRelayAdapter } from "./pushRelayAdapter.js"

export async function pushRelayFolderUpdate(
  adapter: PushRelayAdapter,
  type: (typeof folderUpdateType)[keyof typeof folderUpdateType],
  folder: Folder,
  device: IdentityDevice,
  database: DatabaseConnection,
): Promise<void> {
  const devicesResult = identityDeviceFindByUser(database, folder.userUuid)
  if (!devicesResult.success || !devicesResult.data.some((candidate) => candidate.pushToken !== null)) return
  try {
    await adapter.dispatch({
      userId: folder.userUuid,
      organizationId: null,
      deviceId: device.pushUuid,
      identifier: device.uuid,
      type,
      payload: { id: folder.uuid, userId: folder.userUuid, revisionDate: folder.updatedAt },
      clientType: null,
      installationId: null,
    })
  } catch {
    return
  }
}
