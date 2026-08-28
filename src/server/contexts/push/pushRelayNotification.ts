export type PushRelayNotification = {
  userId: string
  organizationId: string | null
  deviceId: string | null
  identifier: string | null
  type: number
  payload: Readonly<Record<string, unknown>>
  clientType: string | null
  installationId: string | null
}
