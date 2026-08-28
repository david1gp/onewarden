import * as v from "valibot"

export const identitySsoAuthorizeDataSchema = v.object({
  clientId: v.string(),
  redirectUri: v.string(),
  responseType: v.optional(v.string()),
  scope: v.optional(v.string()),
  state: v.string(),
  codeChallenge: v.string(),
  codeChallengeMethod: v.string(),
  responseMode: v.optional(v.string()),
  domainHint: v.optional(v.string()),
  ssoToken: v.optional(v.string()),
})

export type IdentitySsoAuthorizeData = v.InferOutput<typeof identitySsoAuthorizeDataSchema>
