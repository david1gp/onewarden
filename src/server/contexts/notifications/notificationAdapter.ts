import type { CipherNotification } from "../ciphers/cipherNotification.js"
import type { CipherUserNotification } from "../ciphers/cipherUserNotification.js"
import type { FolderNotification } from "../folders/folderNotification.js"
import type { SendNotification } from "../sends/sendNotification.js"
import type { NotificationUpdate } from "./notificationUpdate.js"

export type NotificationAdapter = {
  sendUpdate: (userIds: readonly string[], update: NotificationUpdate) => void
  sendCipherUpdate: (notification: CipherNotification) => void
  sendFolderUpdate: (notification: FolderNotification) => void
  sendSendUpdate?: (notification: SendNotification) => void
  sendUserUpdate: (notification: CipherUserNotification) => void
}
