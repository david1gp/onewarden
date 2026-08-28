export type EmergencyAccess = {
  uuid: string
  grantorUuid: string
  granteeUuid: string | null
  email: string | null
  keyEncrypted: string | null
  type: number
  status: number
  waitTimeDays: number
  recoveryInitiatedAt: string | null
  lastNotificationAt: string | null
  updatedAt: string
  createdAt: string
}
