import * as v from "valibot"

export const extensionCipherSshKeySchema = v.looseObject({
  privateKey: v.optional(v.nullable(v.string())),
  publicKey: v.optional(v.nullable(v.string())),
  keyFingerprint: v.optional(v.nullable(v.string())),
})

export type ExtensionCipherSshKey = v.InferOutput<typeof extensionCipherSshKeySchema>
