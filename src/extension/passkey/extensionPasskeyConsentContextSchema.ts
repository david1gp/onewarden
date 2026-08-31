import * as v from "valibot"

export const extensionPasskeyConsentContextSchema = v.strictObject({
  requestId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  operation: v.picklist(["create", "get"]),
  rpId: v.pipe(v.string(), v.minLength(1), v.maxLength(253)),
  rpName: v.nullable(v.string()),
  userName: v.nullable(v.string()),
  userId: v.nullable(v.string()),
  credentialId: v.nullable(v.string()),
  cipherId: v.nullable(v.string()),
  allowCredentialIds: v.optional(v.array(v.string())),
  userVerification: v.picklist(["required", "preferred", "discouraged"]),
  clientDataJSON: v.pipe(v.string(), v.minLength(1)),
  expiresAt: v.number(),
})

export type ExtensionPasskeyConsentContext = v.InferOutput<typeof extensionPasskeyConsentContextSchema>
