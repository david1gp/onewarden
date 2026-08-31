import * as v from "valibot"

export const sendAccessTokenResponseSchema = v.object({
  access_token: v.string(),
  expires_in: v.number(),
  token_type: v.literal("Bearer"),
  scope: v.literal("api.send.access"),
})

export type SendAccessTokenResponse = v.InferOutput<typeof sendAccessTokenResponseSchema>
