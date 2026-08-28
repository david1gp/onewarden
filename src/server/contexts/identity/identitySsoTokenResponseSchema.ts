import * as v from "valibot"

export const identitySsoTokenResponseSchema = v.object({
  access_token: v.string(),
  id_token: v.string(),
  refresh_token: v.nullish(v.string()),
  expires_in: v.nullish(v.number()),
})

export type IdentitySsoTokenResponse = v.InferOutput<typeof identitySsoTokenResponseSchema>
