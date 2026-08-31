import * as v from "valibot"

export const webAuthTwoFactorWebAuthnDeleteRequestSchema = v.object({
  id: v.union([v.number(), v.string()]),
  masterPasswordHash: v.string(),
})

export type WebAuthTwoFactorWebAuthnDeleteRequest = v.InferOutput<typeof webAuthTwoFactorWebAuthnDeleteRequestSchema>
export type WebAuthTwoFactorWebAuthnDeleteRequestInput = v.InferInput<
  typeof webAuthTwoFactorWebAuthnDeleteRequestSchema
>
