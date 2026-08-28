import * as v from "valibot"

export const identitySsoAuthenticatedUserSchema = v.object({
  refresh_token: v.nullable(v.string()),
  access_token: v.string(),
  expires_in: v.nullable(v.number()),
  identifier: v.string(),
  email: v.string(),
  email_verified: v.nullable(v.boolean()),
  user_name: v.nullable(v.string()),
})

export type IdentitySsoAuthenticatedUser = v.InferOutput<typeof identitySsoAuthenticatedUserSchema>
