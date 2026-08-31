import * as v from "valibot"

export const bitwardenFido2CredentialSchema = v.looseObject({
  credentialId: v.string(),
  keyType: v.string(),
  keyAlgorithm: v.string(),
  keyCurve: v.string(),
  keyValue: v.string(),
  rpId: v.string(),
  userHandle: v.optional(v.nullable(v.string())),
  userName: v.optional(v.nullable(v.string())),
  counter: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
  rpName: v.optional(v.nullable(v.string())),
  userDisplayName: v.optional(v.nullable(v.string())),
  discoverable: v.boolean(),
  creationDate: v.string(),
})

export type BitwardenFido2Credential = v.InferOutput<typeof bitwardenFido2CredentialSchema>
