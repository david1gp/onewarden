import * as v from "valibot"

export const identitySsoUserInfoSchema = v.object({
  email: v.nullish(v.string()),
  email_verified: v.nullish(v.boolean()),
  preferred_username: v.nullish(v.string()),
})

export type IdentitySsoUserInfo = v.InferOutput<typeof identitySsoUserInfoSchema>
