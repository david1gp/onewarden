import * as v from "valibot"

export const identityRefreshTokenResponseSchema = v.object({
  refresh_token: v.string(),
  access_token: v.string(),
  expires_in: v.number(),
  token_type: v.literal("Bearer"),
  scope: v.literal("api offline_access"),
})

export type IdentityRefreshTokenResponse = v.InferOutput<typeof identityRefreshTokenResponseSchema>
