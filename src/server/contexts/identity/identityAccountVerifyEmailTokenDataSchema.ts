import * as v from "valibot"

export const identityAccountVerifyEmailTokenDataSchema = v.object({
  userId: v.string(),
  token: v.string(),
})

export type IdentityAccountVerifyEmailTokenData = v.InferOutput<typeof identityAccountVerifyEmailTokenDataSchema>
