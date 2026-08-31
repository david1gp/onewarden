import * as v from "valibot"

export const webAuthVerifyEmailRequestSchema = v.object({
  userId: v.string(),
  token: v.string(),
})

export type WebAuthVerifyEmailRequest = v.InferOutput<typeof webAuthVerifyEmailRequestSchema>
export type WebAuthVerifyEmailRequestInput = v.InferInput<typeof webAuthVerifyEmailRequestSchema>
