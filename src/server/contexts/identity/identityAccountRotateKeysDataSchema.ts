import * as v from "valibot"

const identityAccountRotateIntegerSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(-2_147_483_648),
  v.maxValue(2_147_483_647),
)

const identityAccountRotateFolderDataSchema = v.object({
  id: v.nullish(v.string()),
  name: v.string(),
})

const identityAccountRotateEmergencyAccessDataSchema = v.object({
  id: v.string(),
  keyEncrypted: v.string(),
})

const identityAccountRotateOrganizationDataSchema = v.object({
  organizationId: v.string(),
  resetPasswordKey: v.string(),
})

const identityAccountRotateUnlockDataSchema = v.object({
  emergencyAccessUnlockData: v.array(identityAccountRotateEmergencyAccessDataSchema),
  masterPasswordUnlockData: v.object({
    kdfType: identityAccountRotateIntegerSchema,
    kdfIterations: identityAccountRotateIntegerSchema,
    kdfParallelism: v.nullish(identityAccountRotateIntegerSchema),
    kdfMemory: v.nullish(identityAccountRotateIntegerSchema),
    email: v.string(),
    masterKeyAuthenticationHash: v.string(),
    masterKeyEncryptedUserKey: v.string(),
  }),
  organizationAccountRecoveryUnlockData: v.array(identityAccountRotateOrganizationDataSchema),
})

export const identityAccountRotateKeysDataSchema = v.object({
  accountUnlockData: identityAccountRotateUnlockDataSchema,
  accountKeys: v.object({
    userKeyEncryptedAccountPrivateKey: v.string(),
    accountPublicKey: v.string(),
  }),
  accountData: v.object({
    ciphers: v.array(v.unknown()),
    folders: v.array(identityAccountRotateFolderDataSchema),
    sends: v.array(v.unknown()),
  }),
  oldMasterKeyAuthenticationHash: v.string(),
})

export type IdentityAccountRotateKeysData = v.InferOutput<typeof identityAccountRotateKeysDataSchema>
