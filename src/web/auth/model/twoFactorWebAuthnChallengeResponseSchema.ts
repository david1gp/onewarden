import * as v from "valibot"

const twoFactorWebAuthnRpSchema = v.object({
  id: v.string(),
  name: v.string(),
})

const twoFactorWebAuthnUserSchema = v.object({
  id: v.string(),
  name: v.string(),
  displayName: v.string(),
})

const twoFactorWebAuthnCredentialSchema = v.object({
  id: v.string(),
  type: v.literal("public-key"),
  transports: v.optional(
    v.array(
      v.union([v.literal("usb"), v.literal("nfc"), v.literal("ble"), v.literal("internal"), v.literal("hybrid")]),
    ),
  ),
})

const twoFactorWebAuthnParameterSchema = v.object({
  alg: v.number(),
  type: v.literal("public-key"),
})

const twoFactorWebAuthnAttestationSchema = v.union([
  v.literal("none"),
  v.literal("indirect"),
  v.literal("direct"),
  v.literal("enterprise"),
])

export const twoFactorWebAuthnChallengeResponseSchema = v.looseObject({
  challenge: v.string(),
  rp: v.optional(twoFactorWebAuthnRpSchema),
  user: v.optional(twoFactorWebAuthnUserSchema),
  status: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  userId: v.optional(v.string()),
  userName: v.optional(v.string()),
  userDisplayName: v.optional(v.string()),
  rpId: v.optional(v.string()),
  rpName: v.optional(v.string()),
  timeout: v.optional(v.number()),
  attestation: v.optional(twoFactorWebAuthnAttestationSchema),
  authenticatorSelection: v.optional(
    v.object({
      requireResidentKey: v.optional(v.boolean()),
      residentKey: v.optional(v.union([v.literal("discouraged"), v.literal("preferred"), v.literal("required")])),
      userVerification: v.optional(v.union([v.literal("discouraged"), v.literal("preferred"), v.literal("required")])),
    }),
  ),
  pubKeyCredParams: v.optional(v.array(twoFactorWebAuthnParameterSchema)),
  excludeCredentials: v.optional(v.array(twoFactorWebAuthnCredentialSchema)),
  allowCredentials: v.optional(v.array(twoFactorWebAuthnCredentialSchema)),
  userVerification: v.optional(v.union([v.literal("discouraged"), v.literal("preferred"), v.literal("required")])),
  extensions: v.optional(v.record(v.string(), v.unknown())),
})

export type TwoFactorWebAuthnChallengeResponse = v.InferOutput<typeof twoFactorWebAuthnChallengeResponseSchema>
