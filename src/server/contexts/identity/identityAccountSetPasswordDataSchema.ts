import * as v from "valibot"
import { identityAccountKeysDataSchema } from "./identityAccountKeysDataSchema.js"
import { identityAccountKdfDataSchema } from "./identityAccountKdfDataSchema.js"

export const identityAccountSetPasswordDataSchema = v.object({
  ...identityAccountKdfDataSchema.entries,
  key: v.string(),
  keys: v.nullish(identityAccountKeysDataSchema),
  masterPasswordHash: v.string(),
  masterPasswordHint: v.nullish(v.string()),
  orgIdentifier: v.nullish(v.string()),
})

export type IdentityAccountSetPasswordData = v.InferOutput<typeof identityAccountSetPasswordDataSchema>
