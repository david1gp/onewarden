import type { IdentityDevice } from "../identity/identityDevice.js"
import type { Folder } from "./folder.js"
import type { FolderNotificationAdapter } from "./folderNotificationAdapter.js"
import type { folderUpdateType } from "./folderUpdateType.js"

export async function folderNotificationSend(
  adapter: FolderNotificationAdapter,
  type: (typeof folderUpdateType)[keyof typeof folderUpdateType],
  folder: Folder,
  device: IdentityDevice,
): Promise<void> {
  try {
    await adapter.sendFolderUpdate({
      contextId: device.uuid,
      folder,
      payload: { Id: folder.uuid, RevisionDate: folder.updatedAt, UserId: folder.userUuid },
      type,
    })
  } catch {
    return
  }
}
