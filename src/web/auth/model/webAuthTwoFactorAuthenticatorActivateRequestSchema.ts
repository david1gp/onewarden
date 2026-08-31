import * as v from "valibot"

export const webAuthTwoFactorAuthenticatorActivateRequestSchema = v.object({
  key: v.string(),
  token: v.pipe(v.union([v.string(), v.number()]), v.transform(String)),
  masterPasswordHash: v.optional(v.nullable(v.string()), null),
})

export type WebAuthTwoFactorAuthenticatorActivateRequest = v.InferOutput<
  typeof webAuthTwoFactorAuthenticatorActivateRequestSchema
>
export type WebAuthTwoFactorAuthenticatorActivateRequestInput = v.InferInput<
  typeof webAuthTwoFactorAuthenticatorActivateRequestSchema
>
