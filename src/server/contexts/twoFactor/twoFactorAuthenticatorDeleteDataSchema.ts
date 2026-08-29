import * as v from "valibot"

export const twoFactorAuthenticatorDeleteDataSchema = v.object({
  key: v.string(),
  masterPasswordHash: v.string(),
  type: v.union([v.number(), v.string()]),
})

export type TwoFactorAuthenticatorDeleteData = v.InferOutput<typeof twoFactorAuthenticatorDeleteDataSchema>
