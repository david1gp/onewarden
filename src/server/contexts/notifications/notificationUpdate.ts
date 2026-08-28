import type { NotificationMessagePackValue } from "./notificationMessagePackEncode.js"

export type NotificationUpdate = {
  contextId: string | null
  payload: Readonly<Record<string, NotificationMessagePackValue>>
  type: number
}
