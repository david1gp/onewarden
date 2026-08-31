import * as v from "valibot"
import { extensionPasskeyConsentSchema } from "./extensionPasskeyConsentSchema.js"

export const extensionPasskeyAssertionRequestSchema = v.strictObject({
  rpId: v.pipe(v.string(), v.minLength(1), v.maxLength(253)),
  clientDataJSON: v.pipe(v.string(), v.minLength(1), v.maxLength(131_072)),
  allowCredentialIds: v.optional(v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(256))), []),
  credentialId: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1), v.maxLength(256))), null),
  userHandle: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1), v.maxLength(128))), null),
  userVerification: v.optional(v.picklist(["required", "preferred", "discouraged"]), "discouraged"),
  consent: v.optional(extensionPasskeyConsentSchema),
})

export type ExtensionPasskeyAssertionRequest = v.InferOutput<typeof extensionPasskeyAssertionRequestSchema>
