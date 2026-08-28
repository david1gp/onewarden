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
  token: string | null
  userId: string | null
  targetEmail: string | null
  timestamp: string
  actingEmail?: string
}
