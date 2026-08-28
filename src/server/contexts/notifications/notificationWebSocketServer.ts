import type { NotificationWebSocketData } from "./notificationWebSocketData.js"

export type NotificationWebSocketServer = {
  requestIP?: (request: Request) => { address: string } | null
  upgrade: (request: Request, options: { data: NotificationWebSocketData }) => boolean
}
