import type { Result } from "#result"
import type { IdentityMailMessage } from "./identityMailMessage.js"

export type IdentityMailAdapter = {
  messages?: IdentityMailMessage[]
  sendRegisterVerifyEmail: (email: string, token: string) => Promise<Result<void>>
  sendWelcome: (email: string) => Promise<Result<void>>
  sendWelcomeMustVerify: (email: string, userId: string, token?: string) => Promise<Result<void>>
  sendChangeEmail?: (email: string, token: string, userId?: string) => Promise<Result<void>>
  sendChangeEmailInvited?: (email: string, actingEmail: string, userId?: string) => Promise<Result<void>>
  sendChangeEmailExisting?: (email: string, actingEmail: string, userId?: string) => Promise<Result<void>>
  sendVerifyEmail?: (email: string, userId: string, token?: string) => Promise<Result<void>>
  sendDeleteAccount?: (email: string, userId: string, token?: string) => Promise<Result<void>>
  sendPasswordHint?: (email: string, hint: string | null) => Promise<Result<void>>
  sendInvite?: (email: string, organizationName: string, memberId: string) => Promise<Result<void>>
  sendTest?: (email: string) => Promise<Result<void>>
}
