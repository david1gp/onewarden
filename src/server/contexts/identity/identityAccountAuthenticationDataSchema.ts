import * as v from "valibot"
import { identityKdfSchema } from "./identityKdfSchema.js"

export const identityAccountAuthenticationDataSchema = v.object({
  salt: v.string(),
  kdf: identityKdfSchema,
  masterPasswordAuthenticationHash: v.string(),
})

export type IdentityAccountAuthenticationData = v.InferOutput<typeof identityAccountAuthenticationDataSchema>
