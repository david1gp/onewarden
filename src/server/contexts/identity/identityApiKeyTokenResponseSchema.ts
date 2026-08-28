import * as v from "valibot"

const identityApiKeyAccountKeysSchema = v.object({
  publicKeyEncryptionKeyPair: v.object({
    wrappedPrivateKey: v.nullable(v.string()),
    publicKey: v.nullable(v.string()),
    Object: v.literal("publicKeyEncryptionKeyPair"),
  }),
  Object: v.literal("privateKeys"),
})

const identityApiKeyUserDecryptionOptionsSchema = v.object({
  HasMasterPassword: v.boolean(),
  MasterPasswordUnlock: v.nullable(
    v.object({
      Kdf: v.object({
        KdfType: v.number(),
        Iterations: v.number(),
        Memory: v.nullable(v.number()),
        Parallelism: v.nullable(v.number()),
      }),
      MasterKeyEncryptedUserKey: v.string(),
      MasterKeyWrappedUserKey: v.string(),
      Salt: v.string(),
    }),
  ),
  Object: v.literal("userDecryptionOptions"),
})

export const identityApiKeyTokenResponseSchema = v.object({
  access_token: v.string(),
  expires_in: v.number(),
  token_type: v.literal("Bearer"),
  Key: v.optional(v.string()),
  PrivateKey: v.nullable(v.string()),
  Kdf: v.number(),
  KdfIterations: v.number(),
  KdfMemory: v.nullable(v.number()),
  KdfParallelism: v.nullable(v.number()),
  ResetMasterPassword: v.boolean(),
  ForcePasswordReset: v.boolean(),
  scope: v.literal("api"),
  AccountKeys: v.nullable(identityApiKeyAccountKeysSchema),
  UserDecryptionOptions: identityApiKeyUserDecryptionOptionsSchema,
})

export type IdentityApiKeyTokenResponse = v.InferOutput<typeof identityApiKeyTokenResponseSchema>
