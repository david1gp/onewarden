import * as v from "valibot"
import { twoFactorWebAuthnChallengeResponseSchema } from "../../web/auth/model/twoFactorWebAuthnChallengeResponseSchema.js"

export const extensionLoginChallengeSchema = v.strictObject({
  challengeId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  providers: v.pipe(v.array(v.picklist([0, 1, 7, 8])), v.minLength(1)),
  emailHint: v.optional(v.nullable(v.string()), null),
  webAuthn: v.optional(v.nullable(twoFactorWebAuthnChallengeResponseSchema), null),
  errorMessage: v.optional(v.nullable(v.string()), null),
})

export type ExtensionLoginChallenge = v.InferOutput<typeof extensionLoginChallengeSchema>
