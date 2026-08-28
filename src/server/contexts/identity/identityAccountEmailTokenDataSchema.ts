import * as v from "valibot"

export const identityAccountEmailTokenDataSchema = v.object({
  masterPasswordHash: v.string(),
  newEmail: v.string(),
})

export type IdentityAccountEmailTokenData = v.InferOutput<typeof identityAccountEmailTokenDataSchema>
