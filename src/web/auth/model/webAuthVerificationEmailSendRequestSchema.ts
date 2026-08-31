import * as v from "valibot"

export const webAuthVerificationEmailSendRequestSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.toLowerCase()),
  name: v.optional(v.nullable(v.string()), null),
})

export type WebAuthVerificationEmailSendRequest = v.InferOutput<typeof webAuthVerificationEmailSendRequestSchema>
export type WebAuthVerificationEmailSendRequestInput = v.InferInput<typeof webAuthVerificationEmailSendRequestSchema>
