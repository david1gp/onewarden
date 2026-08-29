export type IdentityMailMessage = {
  recipient: string
  kind:
    | "registerVerify"
    | "welcome"
    | "welcomeMustVerify"
    | "changeEmail"
    | "changeEmailInvited"
    | "changeEmailExisting"
    | "verifyEmail"
    | "deleteAccount"
    | "passwordHint"
    | "twoFactorToken"
    | "protectedActionToken"
    | "incompleteTwoFactor"
    | "emergencyAccessInvite"
    | "emergencyAccessInviteAccepted"
    | "emergencyAccessInviteConfirmed"
    | "emergencyAccessRecoveryInitiated"
    | "emergencyAccessRecoveryApproved"
    | "emergencyAccessRecoveryRejected"
    | "emergencyAccessRecoveryReminder"
    | "emergencyAccessRecoveryTimedOut"
  token: string | null
  userId: string | null
  targetEmail: string | null
  timestamp: string
  ipAddress?: string
  loginTime?: string
  deviceName?: string
  deviceType?: number
  actingEmail?: string
}
