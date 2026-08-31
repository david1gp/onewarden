import * as v from "valibot"

export const webAuthTwoFactorWebAuthnActivatePayloadSchema = v.object({
  id: v.union([v.number(), v.string()]),
  name: v.string(),
  deviceResponse: v.unknown(),
})

export type WebAuthTwoFactorWebAuthnActivatePayload = v.InferOutput<
  typeof webAuthTwoFactorWebAuthnActivatePayloadSchema
>
