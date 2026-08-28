export type NotificationWebSocketData = {
  closed?: boolean
  connectionId: string
  ip: string
  key: string
  kind: "anonymous" | "authenticated"
}
