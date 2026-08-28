import type { Result } from "#result"

export type IdentityMailAdapter = {
  sendRegisterVerifyEmail: (email: string, token: string) => Promise<Result<void>>
  sendWelcome: (email: string) => Promise<Result<void>>
  sendWelcomeMustVerify: (email: string, userId: string) => Promise<Result<void>>
}
