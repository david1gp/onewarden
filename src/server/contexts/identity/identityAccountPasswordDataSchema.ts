import * as v from "valibot"
import { identityAccountAuthenticationDataSchema } from "./identityAccountAuthenticationDataSchema.js"
import { identityAccountUnlockDataSchema } from "./identityAccountUnlockDataSchema.js"

const identityAccountOptionalStringSchema = v.nullish(v.string())

export const identityAccountPasswordDataSchema = v.object({
  masterPasswordHash: v.string(),
  masterPasswordHint: identityAccountOptionalStringSchema,
  authenticationData: v.nullish(identityAccountAuthenticationDataSchema),
  unlockData: v.nullish(identityAccountUnlockDataSchema),
  newMasterPasswordHash: identityAccountOptionalStringSchema,
  key: identityAccountOptionalStringSchema,
})

export type IdentityAccountPasswordData = v.InferOutput<typeof identityAccountPasswordDataSchema>
