import * as v from "valibot"

export const identityAccountDeleteRecoverTokenDataSchema = v.object({
  userId: v.string(),
  token: v.string(),
})

export type IdentityAccountDeleteRecoverTokenData = v.InferOutput<typeof identityAccountDeleteRecoverTokenDataSchema>
