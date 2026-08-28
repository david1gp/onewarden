import * as v from "valibot"

export const identitySsoIdentityClaimsSchema = v.object({
  iss: v.string(),
  sub: v.string(),
  email: v.nullish(v.string()),
  email_verified: v.nullish(v.boolean()),
  preferred_username: v.nullish(v.string()),
  nonce: v.nullish(v.string()),
})

export type IdentitySsoIdentityClaims = v.InferOutput<typeof identitySsoIdentityClaimsSchema>
