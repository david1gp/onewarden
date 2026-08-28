import * as v from "valibot"

const bitwardenPasswordTokenKdfSchema = v.object({
  KdfType: v.number(),
  Iterations: v.number(),
  Memory: v.nullable(v.number()),
  Parallelism: v.nullable(v.number()),
})

const bitwardenPasswordTokenUnlockSchema = v.object({
  Kdf: bitwardenPasswordTokenKdfSchema,
  MasterKeyEncryptedUserKey: v.string(),
  MasterKeyWrappedUserKey: v.string(),
  Salt: v.string(),
})

const bitwardenPasswordTokenAccountKeysSchema = v.object({
  publicKeyEncryptionKeyPair: v.object({
    wrappedPrivateKey: v.nullable(v.string()),
    publicKey: v.nullable(v.string()),
    Object: v.literal("publicKeyEncryptionKeyPair"),
  }),
  Object: v.literal("privateKeys"),
})

export const bitwardenPasswordTokenResponseSchema = v.looseObject({
  access_token: v.string(),
  expires_in: v.number(),
  token_type: v.literal("Bearer"),
  refresh_token: v.string(),
  PrivateKey: v.nullable(v.string()),
  Kdf: v.number(),
  KdfIterations: v.number(),
  KdfMemory: v.nullable(v.number()),
  KdfParallelism: v.nullable(v.number()),
  ResetMasterPassword: v.boolean(),
  ForcePasswordReset: v.boolean(),
  MasterPasswordPolicy: v.looseObject({ Object: v.literal("masterPasswordPolicy") }),
  scope: v.string(),
  AccountKeys: v.nullable(bitwardenPasswordTokenAccountKeysSchema),
  UserDecryptionOptions: v.object({
    HasMasterPassword: v.boolean(),
    MasterPasswordUnlock: v.nullable(bitwardenPasswordTokenUnlockSchema),
    Object: v.literal("userDecryptionOptions"),
  }),
  Key: v.optional(v.string()),
  TwoFactorToken: v.optional(v.string()),
})

export type BitwardenPasswordTokenResponse = v.InferOutput<typeof bitwardenPasswordTokenResponseSchema>
