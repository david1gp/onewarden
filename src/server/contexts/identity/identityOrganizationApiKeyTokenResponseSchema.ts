import * as v from "valibot"

export const identityOrganizationApiKeyTokenResponseSchema = v.object({
  access_token: v.string(),
  expires_in: v.literal(3600),
  token_type: v.literal("Bearer"),
  scope: v.literal("api.organization"),
})

export type IdentityOrganizationApiKeyTokenResponse = v.InferOutput<
  typeof identityOrganizationApiKeyTokenResponseSchema
>
