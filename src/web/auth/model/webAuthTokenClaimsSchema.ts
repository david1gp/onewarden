import * as v from "valibot"

export const webAuthTokenClaimsSchema = v.object({
  sub: v.optional(v.string()),
})

export type WebAuthTokenClaims = v.InferOutput<typeof webAuthTokenClaimsSchema>
