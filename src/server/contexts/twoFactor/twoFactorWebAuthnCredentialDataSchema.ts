import * as v from "valibot"

const twoFactorWebAuthnCredentialCounterSchema = v.pipe(v.number(), v.safeInteger(), v.minValue(0))

export const twoFactorWebAuthnCredentialDataSchema = v.object({
  counter: v.optional(twoFactorWebAuthnCredentialCounterSchema),
  id: v.pipe(v.string(), v.minLength(1)),
  publicKey: v.optional(v.string()),
  transports: v.optional(v.array(v.string())),
})

export type TwoFactorWebAuthnCredentialData = v.InferOutput<typeof twoFactorWebAuthnCredentialDataSchema>
