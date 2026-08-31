import * as v from "valibot"

export const webAuthTwoFactorEmailActivateRequestSchema = v.object({
  email: v.string(),
  token: v.string(),
  masterPasswordHash: v.optional(v.string()),
})

export type WebAuthTwoFactorEmailActivateRequest = v.InferOutput<typeof webAuthTwoFactorEmailActivateRequestSchema>
export type WebAuthTwoFactorEmailActivateRequestInput = v.InferInput<typeof webAuthTwoFactorEmailActivateRequestSchema>
