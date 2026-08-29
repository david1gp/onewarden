import * as v from "valibot"

export const identityAccountKeysSchema = v.object({
  publicKeyEncryptionKeyPair: v.object({
    wrappedPrivateKey: v.nullable(v.string()),
    publicKey: v.nullable(v.string()),
    Object: v.literal("publicKeyEncryptionKeyPair"),
  }),
  Object: v.literal("privateKeys"),
})
