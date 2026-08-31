import * as v from "valibot"

export const webAuthTwoFactorEmailSendRequestSchema = v.object({
  email: v.string(),
  masterPasswordHash: v.optional(v.string()),
})

export type WebAuthTwoFactorEmailSendRequest = v.InferOutput<typeof webAuthTwoFactorEmailSendRequestSchema>
export type WebAuthTwoFactorEmailSendRequestInput = v.InferInput<typeof webAuthTwoFactorEmailSendRequestSchema>
