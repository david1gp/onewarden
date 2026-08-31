import * as v from "valibot"

export const extensionPasskeyConsentUiModelSchema = v.strictObject({
  requestId: v.pipe(v.string(), v.minLength(1)),
  operation: v.picklist(["create", "get"]),
  rpId: v.pipe(v.string(), v.minLength(1)),
  rpName: v.nullable(v.string()),
  userName: v.nullable(v.string()),
  verificationRequired: v.boolean(),
  verified: v.boolean(),
  locked: v.boolean(),
  expiresAt: v.number(),
  candidates: v.array(
    v.strictObject({
      cipherId: v.pipe(v.string(), v.minLength(1)),
      credentialId: v.nullable(v.string()),
      revisionDate: v.string(),
      name: v.string(),
      userName: v.nullable(v.string()),
      organization: v.boolean(),
      readOnly: v.boolean(),
    }),
  ),
})

export type ExtensionPasskeyConsentUiModel = v.InferOutput<typeof extensionPasskeyConsentUiModelSchema>
