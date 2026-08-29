import * as v from "valibot"
import { identityAccountKeysDataSchema } from "./identityAccountKeysDataSchema.js"
import { identityKdfFieldsSchema } from "./identityKdfFieldsSchema.js"
import { identityKdfSchema } from "./identityKdfSchema.js"

const identityOptionalStringSchema = v.nullish(v.string())

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
  ...identityKdfFieldsSchema,
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
  keys: v.nullish(identityAccountKeysDataSchema),
  userAsymmetricKeys: v.nullish(identityAccountKeysDataSchema),
  masterPasswordAuthentication: v.nullish(identityMasterPasswordAuthenticationSchema),
  masterPasswordUnlock: v.nullish(identityMasterPasswordUnlockSchema),
})

export type IdentityRegistrationData = v.InferOutput<typeof identityRegistrationDataSchema>
