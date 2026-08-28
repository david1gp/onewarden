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
  actingEmail?: string
}
