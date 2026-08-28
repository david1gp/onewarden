import * as v from "valibot"
import { identityKdfSchema } from "./identityKdfSchema.js"

const identityOptionalStringSchema = v.nullish(v.string())
const identityRegistrationIntegerSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(-2_147_483_648),
  v.maxValue(2_147_483_647),
)

const identityKeysSchema = v.object({
  encryptedPrivateKey: v.string(),
  publicKey: v.string(),
})

const identityMasterPasswordAuthenticationSchema = v.object({
  kdf: identityKdfSchema,
  salt: v.string(),
  hash: identityOptionalStringSchema,
  masterPasswordAuthenticationHash: identityOptionalStringSchema,
})

const identityMasterPasswordUnlockSchema = v.object({
  kdf: identityKdfSchema,
  salt: v.string(),
  key: identityOptionalStringSchema,
  masterKeyWrappedUserKey: identityOptionalStringSchema,
})

export const identityRegistrationDataSchema = v.object({
  email: v.string(),
  kdf: v.optional(identityRegistrationIntegerSchema),
  kdfType: v.optional(identityRegistrationIntegerSchema),
  kdfIterations: v.optional(identityRegistrationIntegerSchema),
  iterations: v.optional(identityRegistrationIntegerSchema),
  kdfMemory: v.nullish(identityRegistrationIntegerSchema),
  memory: v.nullish(identityRegistrationIntegerSchema),
  kdfParallelism: v.nullish(identityRegistrationIntegerSchema),
  parallelism: v.nullish(identityRegistrationIntegerSchema),
  key: identityOptionalStringSchema,
  userSymmetricKey: identityOptionalStringSchema,
  masterPasswordHash: identityOptionalStringSchema,
  master_password_hash: identityOptionalStringSchema,
  masterPasswordHint: identityOptionalStringSchema,
  name: identityOptionalStringSchema,
  organizationUserId: identityOptionalStringSchema,
  emailVerificationToken: identityOptionalStringSchema,
  acceptEmergencyAccessId: identityOptionalStringSchema,
  acceptEmergencyAccessInviteToken: identityOptionalStringSchema,
  orgInviteToken: identityOptionalStringSchema,
  token: identityOptionalStringSchema,
  keys: v.nullish(identityKeysSchema),
  userAsymmetricKeys: v.nullish(identityKeysSchema),
  masterPasswordAuthentication: v.nullish(identityMasterPasswordAuthenticationSchema),
  masterPasswordUnlock: v.nullish(identityMasterPasswordUnlockSchema),
})

export type IdentityRegistrationData = v.InferOutput<typeof identityRegistrationDataSchema>
