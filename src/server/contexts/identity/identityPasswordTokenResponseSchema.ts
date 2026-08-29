import * as v from "valibot"
import { identityAccountKeysSchema } from "./identityAccountKeysSchema.js"
import { identityMasterPasswordUnlockSchema } from "./identityMasterPasswordUnlockSchema.js"

const identityUserDecryptionOptionsSchema = v.object({
  HasMasterPassword: v.boolean(),
  MasterPasswordUnlock: v.nullable(identityMasterPasswordUnlockSchema),
  Object: v.literal("userDecryptionOptions"),
})

export const identityPasswordTokenResponseSchema = v.object({
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
  MasterPasswordPolicy: v.object({ Object: v.literal("masterPasswordPolicy") }),
  scope: v.string(),
  AccountKeys: v.nullable(identityAccountKeysSchema),
  UserDecryptionOptions: identityUserDecryptionOptionsSchema,
  Key: v.optional(v.string()),
  TwoFactorToken: v.optional(v.string()),
})

export type IdentityPasswordTokenResponse = v.InferOutput<typeof identityPasswordTokenResponseSchema>
