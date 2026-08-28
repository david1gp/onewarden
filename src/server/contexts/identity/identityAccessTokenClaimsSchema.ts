import * as v from "valibot"

export const identityAccessTokenClaimsSchema = v.object({
  nbf: v.pipe(v.number(), v.integer()),
  exp: v.pipe(v.number(), v.integer()),
  iss: v.string(),
  sub: v.string(),
  premium: v.boolean(),
  name: v.string(),
  email: v.string(),
  email_verified: v.boolean(),
  sstamp: v.string(),
  device: v.string(),
  devicetype: v.string(),
  client_id: v.string(),
  scope: v.array(v.string()),
  amr: v.array(v.string()),
})

export type IdentityAccessTokenClaims = v.InferOutput<typeof identityAccessTokenClaimsSchema>
