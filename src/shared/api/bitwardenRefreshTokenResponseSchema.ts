import * as v from "valibot"

export const bitwardenRefreshTokenResponseSchema = v.looseObject({
  refresh_token: v.string(),
  access_token: v.string(),
  expires_in: v.number(),
  token_type: v.literal("Bearer"),
  scope: v.string(),
})

export type BitwardenRefreshTokenResponse = v.InferOutput<typeof bitwardenRefreshTokenResponseSchema>
