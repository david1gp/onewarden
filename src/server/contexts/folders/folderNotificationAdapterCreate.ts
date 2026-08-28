import type { FolderNotificationAdapter } from "./folderNotificationAdapter.js"

export function folderNotificationAdapterCreate(): FolderNotificationAdapter {
  return { sendFolderUpdate: () => undefined }
}
