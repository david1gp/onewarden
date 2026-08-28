import type { NotificationAnonymousConnectionRegistry } from "./notificationAnonymousConnectionRegistry.js"
import type { NotificationAdapter } from "./notificationAdapter.js"
import type { NotificationConnectionRegistry } from "./notificationConnectionRegistry.js"
import type { NotificationWebSocketData } from "./notificationWebSocketData.js"
import type { NotificationWebSocketServer } from "./notificationWebSocketServer.js"

export type NotificationHub = {
  adapter: NotificationAdapter
  anonymous: NotificationAnonymousConnectionRegistry
  authenticated: NotificationConnectionRegistry
  enabled: boolean
  sendAnonymousAuthResponse: (userId: string, authRequestId: string) => void
  upgrade: (request: Request, server: NotificationWebSocketServer) => Promise<Response | undefined>
  websocket: Bun.WebSocketHandler<NotificationWebSocketData>
}
