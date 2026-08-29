import * as v from "valibot"
import { identityAccountKeysSchema } from "./identityAccountKeysSchema.js"
import { identityMasterPasswordUnlockSchema } from "./identityMasterPasswordUnlockSchema.js"

const identityApiKeyUserDecryptionOptionsSchema = v.object({
  HasMasterPassword: v.boolean(),
  MasterPasswordUnlock: v.nullable(identityMasterPasswordUnlockSchema),
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
  AccountKeys: v.nullable(identityAccountKeysSchema),
  UserDecryptionOptions: identityApiKeyUserDecryptionOptionsSchema,
})

export type IdentityApiKeyTokenResponse = v.InferOutput<typeof identityApiKeyTokenResponseSchema>
