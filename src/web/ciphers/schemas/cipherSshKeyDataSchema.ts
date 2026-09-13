import * as v from "valibot"

export const cipherSshKeyDataSchema = v.object({
  privateKey: v.optional(v.nullable(v.string())),
  publicKey: v.optional(v.nullable(v.string())),
  keyFingerprint: v.optional(v.nullable(v.string())),
})

export type CipherSshKeyData = v.InferOutput<typeof cipherSshKeyDataSchema>
