import * as v from "valibot"

export const accountRotateKeysRequestSchema = v.object({
  accountUnlockData: v.object({
    emergencyAccessUnlockData: v.array(
      v.object({
        id: v.string(),
        keyEncrypted: v.string(),
      }),
    ),
    masterPasswordUnlockData: v.object({
      kdfType: v.number(),
      kdfIterations: v.number(),
      kdfParallelism: v.nullable(v.number()),
      kdfMemory: v.nullable(v.number()),
      email: v.string(),
      masterKeyAuthenticationHash: v.string(),
      masterKeyEncryptedUserKey: v.string(),
    }),
    organizationAccountRecoveryUnlockData: v.array(
      v.object({
        organizationId: v.string(),
        resetPasswordKey: v.string(),
      }),
    ),
  }),
  accountKeys: v.object({
    userKeyEncryptedAccountPrivateKey: v.string(),
    accountPublicKey: v.string(),
  }),
  accountData: v.object({
    ciphers: v.array(v.unknown()),
    folders: v.array(
      v.object({
        id: v.nullable(v.string()),
        name: v.string(),
      }),
    ),
    sends: v.array(v.unknown()),
  }),
  oldMasterKeyAuthenticationHash: v.string(),
})

export type AccountRotateKeysRequest = v.InferOutput<typeof accountRotateKeysRequestSchema>
