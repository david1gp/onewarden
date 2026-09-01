import * as v from "valibot"

export const bitwardenEncryptedSshKeySchema = v.looseObject({
  privateKey: v.optional(v.nullable(v.string())),
  publicKey: v.optional(v.nullable(v.string())),
  keyFingerprint: v.optional(v.nullable(v.string())),
})

export type BitwardenEncryptedSshKey = v.InferOutput<typeof bitwardenEncryptedSshKeySchema>
