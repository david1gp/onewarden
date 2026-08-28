import * as v from "valibot"

export const identitySsoRefreshTokenResponseSchema = v.object({
  access_token: v.string(),
  refresh_token: v.nullish(v.string()),
  expires_in: v.nullish(v.number()),
})

export type IdentitySsoRefreshTokenResponse = v.InferOutput<typeof identitySsoRefreshTokenResponseSchema>
