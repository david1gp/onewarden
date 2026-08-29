import * as v from "valibot"

const identityTokenWrapperSchema = v.union([v.object({ Access: v.string() }), v.object({ Refresh: v.string() })])

export const identityRefreshTokenClaimsSchema = v.object({
  nbf: v.pipe(v.number(), v.integer()),
  exp: v.pipe(v.number(), v.integer()),
  iss: v.string(),
  sub: v.union([v.literal("password"), v.literal("sso")]),
  device_token: v.string(),
  token: v.nullish(identityTokenWrapperSchema),
  organization_uuid: v.optional(v.nullable(v.string())),
})

export type IdentityRefreshTokenClaims = v.InferOutput<typeof identityRefreshTokenClaimsSchema>
