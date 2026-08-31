import * as v from "valibot"

export const webAuthTwoFactorAuthenticatorDisableRequestSchema = v.object({
  key: v.string(),
  masterPasswordHash: v.string(),
  type: v.union([v.number(), v.string()]),
})

export type WebAuthTwoFactorAuthenticatorDisableRequest = v.InferOutput<
  typeof webAuthTwoFactorAuthenticatorDisableRequestSchema
>
export type WebAuthTwoFactorAuthenticatorDisableRequestInput = v.InferInput<
  typeof webAuthTwoFactorAuthenticatorDisableRequestSchema
>
