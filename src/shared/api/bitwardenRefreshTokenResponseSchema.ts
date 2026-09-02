import * as v from "valibot"

const bitwardenRefreshTokenSchema = v.pipe(v.string(), v.minLength(1))
const bitwardenRefreshTokenExpirySchema = v.pipe(v.number(), v.finite(), v.safeInteger(), v.minValue(1))

export const bitwardenRefreshTokenResponseSchema = v.looseObject({
  refresh_token: bitwardenRefreshTokenSchema,
  access_token: bitwardenRefreshTokenSchema,
  expires_in: bitwardenRefreshTokenExpirySchema,
  token_type: v.literal("Bearer"),
  scope: v.string(),
})

export type BitwardenRefreshTokenResponse = v.InferOutput<typeof bitwardenRefreshTokenResponseSchema>
