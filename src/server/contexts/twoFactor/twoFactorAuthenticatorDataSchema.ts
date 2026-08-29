import * as v from "valibot"

export const twoFactorAuthenticatorDataSchema = v.object({
  key: v.string(),
  token: v.union([v.number(), v.string()]),
  masterPasswordHash: v.nullish(v.string()),
  otp: v.nullish(v.string()),
})

export type TwoFactorAuthenticatorData = v.InferOutput<typeof twoFactorAuthenticatorDataSchema>
