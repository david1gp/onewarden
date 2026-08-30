export type IdentityMailMessage = {
  recipient: string
  kind:
    | "invite"
    | "inviteAccepted"
    | "inviteConfirmed"
    | "adminResetPassword"
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
  userName?: string
  organizationName?: string
}
