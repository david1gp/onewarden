import * as v from "valibot"

export const identitySsoProviderConfigurationSchema = v.object({
  issuer: v.optional(v.string()),
  authorization_endpoint: v.string(),
  token_endpoint: v.string(),
  userinfo_endpoint: v.string(),
  jwks_uri: v.optional(v.string()),
  token_endpoint_auth_methods_supported: v.optional(v.array(v.string())),
})

export type IdentitySsoProviderConfiguration = v.InferOutput<typeof identitySsoProviderConfigurationSchema>
