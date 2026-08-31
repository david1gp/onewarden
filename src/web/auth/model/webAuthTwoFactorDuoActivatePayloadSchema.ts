import * as v from "valibot"

export const webAuthTwoFactorDuoActivatePayloadSchema = v.object({
  host: v.string(),
  clientId: v.string(),
  clientSecret: v.string(),
})

export type WebAuthTwoFactorDuoActivatePayload = v.InferOutput<typeof webAuthTwoFactorDuoActivatePayloadSchema>
