import * as v from "valibot"
import { identityKdfSchema } from "./identityKdfSchema.js"

export const identityAccountUnlockDataSchema = v.object({
  salt: v.string(),
  kdf: identityKdfSchema,
  masterKeyWrappedUserKey: v.string(),
})

export type IdentityAccountUnlockData = v.InferOutput<typeof identityAccountUnlockDataSchema>
