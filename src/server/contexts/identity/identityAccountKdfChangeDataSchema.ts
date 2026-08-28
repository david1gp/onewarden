import * as v from "valibot"
import { identityAccountAuthenticationDataSchema } from "./identityAccountAuthenticationDataSchema.js"
import { identityAccountUnlockDataSchema } from "./identityAccountUnlockDataSchema.js"

export const identityAccountKdfChangeDataSchema = v.object({
  authenticationData: identityAccountAuthenticationDataSchema,
  unlockData: identityAccountUnlockDataSchema,
  masterPasswordHash: v.string(),
})

export type IdentityAccountKdfChangeData = v.InferOutput<typeof identityAccountKdfChangeDataSchema>
