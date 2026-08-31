import * as v from "valibot"
import { extensionPasskeyConsentSchema } from "./extensionPasskeyConsentSchema.js"

export const extensionPasskeyCredentialCreateRequestSchema = v.strictObject({
  rpId: v.pipe(v.string(), v.minLength(1), v.maxLength(253)),
  rpName: v.optional(v.nullable(v.string()), null),
  userId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  userName: v.optional(v.nullable(v.string()), null),
  userDisplayName: v.optional(v.nullable(v.string()), null),
  clientDataJSON: v.pipe(v.string(), v.minLength(1), v.maxLength(131_072)),
  requireResidentKey: v.optional(v.boolean(), false),
  residentKey: v.optional(v.picklist(["discouraged", "preferred", "required"]), "discouraged"),
  userVerification: v.optional(v.picklist(["required", "preferred", "discouraged"]), "discouraged"),
  excludeCredentialIds: v.optional(v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(256))), []),
  cipherId: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1), v.maxLength(128))), null),
  consent: v.optional(extensionPasskeyConsentSchema),
})

export type ExtensionPasskeyCredentialCreateRequest = v.InferOutput<
  typeof extensionPasskeyCredentialCreateRequestSchema
>
