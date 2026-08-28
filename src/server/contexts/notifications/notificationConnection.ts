export type NotificationConnection = {
  close: () => void
  send: (data: Uint8Array) => boolean
}
