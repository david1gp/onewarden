import * as v from "valibot"

export const twoFactorAuthenticatorResponseSchema = v.object({
  enabled: v.boolean(),
  key: v.string(),
  object: v.literal("twoFactorAuthenticator"),
})

export type TwoFactorAuthenticatorResponse = v.InferOutput<typeof twoFactorAuthenticatorResponseSchema>
