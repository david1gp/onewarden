import * as v from "valibot"

export const webAuthTwoFactorDuoActivateRequestSchema = v.object({
  host: v.string(),
  clientId: v.string(),
  clientSecret: v.string(),
  masterPasswordHash: v.optional(v.string()),
})

export type WebAuthTwoFactorDuoActivateRequest = v.InferOutput<typeof webAuthTwoFactorDuoActivateRequestSchema>
export type WebAuthTwoFactorDuoActivateRequestInput = v.InferInput<typeof webAuthTwoFactorDuoActivateRequestSchema>
