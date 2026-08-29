export type TwoFactorRecord = {
  uuid: string
  userUuid: string
  type: number
  enabled: boolean
  data: string
  lastUsed: number
}
