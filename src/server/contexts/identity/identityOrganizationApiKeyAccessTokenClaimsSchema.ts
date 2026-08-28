import * as v from "valibot"

export const identityOrganizationApiKeyAccessTokenClaimsSchema = v.object({
  nbf: v.pipe(v.number(), v.integer()),
  exp: v.pipe(v.number(), v.integer()),
  iss: v.string(),
  sub: v.string(),
  client_id: v.string(),
  client_sub: v.string(),
  scope: v.array(v.string()),
})

export type IdentityOrganizationApiKeyAccessTokenClaims = v.InferOutput<
  typeof identityOrganizationApiKeyAccessTokenClaimsSchema
>
