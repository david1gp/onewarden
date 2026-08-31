import * as v from "valibot"

export const extensionPasskeyConsentSchema = v.strictObject({
  requestId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  approved: v.boolean(),
  userVerified: v.optional(v.boolean(), false),
  cipherId: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1), v.maxLength(128)))),
  credentialId: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1), v.maxLength(256)))),
})

export type ExtensionPasskeyConsent = v.InferOutput<typeof extensionPasskeyConsentSchema>
