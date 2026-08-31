import * as v from "valibot"

export const webAuthTwoFactorWebAuthnActivateRequestSchema = v.object({
  id: v.union([v.number(), v.string()]),
  name: v.string(),
  deviceResponse: v.unknown(),
  masterPasswordHash: v.optional(v.string()),
})

export type WebAuthTwoFactorWebAuthnActivateRequest = v.InferOutput<
  typeof webAuthTwoFactorWebAuthnActivateRequestSchema
>
export type WebAuthTwoFactorWebAuthnActivateRequestInput = v.InferInput<
  typeof webAuthTwoFactorWebAuthnActivateRequestSchema
>
