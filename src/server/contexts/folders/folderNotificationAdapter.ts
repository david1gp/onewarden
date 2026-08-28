import type { FolderNotification } from "./folderNotification.js"

export type FolderNotificationAdapter = {
  sendFolderUpdate: (notification: FolderNotification) => void | Promise<void>
}
