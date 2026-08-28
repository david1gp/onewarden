import type { SendNotification } from "./sendNotification.js"

export type SendNotificationAdapter = {
  sendSendUpdate?: (notification: SendNotification) => void | Promise<void>
}
