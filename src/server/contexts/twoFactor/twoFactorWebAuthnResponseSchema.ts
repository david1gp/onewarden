import * as v from "valibot"

const twoFactorWebAuthnByteSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255))
const twoFactorWebAuthnBinarySchema = v.union([
  v.pipe(v.string(), v.minLength(1)),
  v.array(twoFactorWebAuthnByteSchema),
])

export const twoFactorWebAuthnResponseSchema = v.looseObject({
  id: v.pipe(v.string(), v.minLength(1)),
  rawId: v.optional(twoFactorWebAuthnBinarySchema),
  raw_id: v.optional(twoFactorWebAuthnBinarySchema),
  type: v.optional(v.literal("public-key")),
  response: v.looseObject({
    clientDataJSON: v.optional(twoFactorWebAuthnBinarySchema),
    clientDataJson: v.optional(twoFactorWebAuthnBinarySchema),
    client_data_json: v.optional(twoFactorWebAuthnBinarySchema),
    authenticatorData: v.optional(twoFactorWebAuthnBinarySchema),
    authenticator_data: v.optional(twoFactorWebAuthnBinarySchema),
    attestationObject: v.optional(twoFactorWebAuthnBinarySchema),
    AttestationObject: v.optional(twoFactorWebAuthnBinarySchema),
    attestation_object: v.optional(twoFactorWebAuthnBinarySchema),
    signature: v.optional(twoFactorWebAuthnBinarySchema),
    userHandle: v.optional(v.nullable(twoFactorWebAuthnBinarySchema)),
    user_handle: v.optional(v.nullable(twoFactorWebAuthnBinarySchema)),
  }),
})

export type TwoFactorWebAuthnResponse = v.InferOutput<typeof twoFactorWebAuthnResponseSchema>
