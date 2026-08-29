import * as v from "valibot"

export const twoFactorWebAuthnChallengeResponseSchema = v.object({
  challenge: v.string(),
  userId: v.optional(v.string()),
  userName: v.optional(v.string()),
  userDisplayName: v.optional(v.string()),
  rpId: v.optional(v.string()),
  rpName: v.optional(v.string()),
  timeout: v.optional(v.number()),
  attestation: v.optional(v.string()),
  authenticatorSelection: v.optional(v.record(v.string(), v.unknown())),
  pubKeyCredParams: v.optional(v.array(v.record(v.string(), v.unknown()))),
  excludeCredentials: v.optional(v.array(v.record(v.string(), v.unknown()))),
  extensions: v.optional(v.record(v.string(), v.unknown())),
})

export type TwoFactorWebAuthnChallengeResponse = v.InferOutput<typeof twoFactorWebAuthnChallengeResponseSchema>
