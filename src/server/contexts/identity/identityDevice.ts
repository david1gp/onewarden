export type IdentityDevice = {
  uuid: string
  createdAt: string
  updatedAt: string
  userUuid: string
  name: string
  type: number
  pushUuid: string | null
  pushToken: string | null
  refreshToken: string
  twoFactorRemember: string | null
}
