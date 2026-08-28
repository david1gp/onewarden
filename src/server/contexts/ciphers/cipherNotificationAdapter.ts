import type { CipherNotification } from "./cipherNotification.js"
import type { CipherUserNotification } from "./cipherUserNotification.js"

export type CipherNotificationAdapter = {
  sendCipherUpdate?: (notification: CipherNotification) => void | Promise<void>
  sendUserUpdate?: (notification: CipherUserNotification) => void | Promise<void>
}
