import * as v from "valibot"

export const bitwardenEncryptedFido2CredentialSchema = v.looseObject({
  credentialId: v.string(),
  keyType: v.string(),
  keyAlgorithm: v.string(),
  keyCurve: v.string(),
  keyValue: v.string(),
  rpId: v.string(),
  userHandle: v.optional(v.nullable(v.string())),
  userName: v.optional(v.nullable(v.string())),
  counter: v.string(),
  rpName: v.optional(v.nullable(v.string())),
  userDisplayName: v.optional(v.nullable(v.string())),
  discoverable: v.string(),
  creationDate: v.string(),
})

export type BitwardenEncryptedFido2Credential = v.InferOutput<typeof bitwardenEncryptedFido2CredentialSchema>
