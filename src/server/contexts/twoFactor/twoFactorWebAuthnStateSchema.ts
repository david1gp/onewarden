import * as v from "valibot"
import { twoFactorWebAuthnCredentialDataSchema } from "./twoFactorWebAuthnCredentialDataSchema.js"

export const twoFactorWebAuthnStateSchema = v.looseObject({
  appId: v.optional(v.string()),
  challenge: v.string(),
  credentialIds: v.array(v.string()),
  credentials: v.optional(v.array(twoFactorWebAuthnCredentialDataSchema)),
  expiresAt: v.pipe(v.number(), v.safeInteger()),
  kind: v.union([v.literal("registration"), v.literal("login")]),
  origin: v.string(),
  rpId: v.string(),
  userUuid: v.string(),
})

export type TwoFactorWebAuthnStateData = v.InferOutput<typeof twoFactorWebAuthnStateSchema>
