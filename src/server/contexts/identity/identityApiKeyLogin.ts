import { type Result } from "#result"
import type { IdentityApiKeyTokenResponse } from "./identityApiKeyTokenResponseSchema.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identityOrganizationApiKeyLogin } from "./identityOrganizationApiKeyLogin.js"
import type { IdentityOrganizationApiKeyTokenResponse } from "./identityOrganizationApiKeyTokenResponseSchema.js"
import type { IdentityApiKeyLoginOptions } from "./identityApiKeyLoginOptions.js"
import { identityPersonalApiKeyLogin } from "./identityPersonalApiKeyLogin.js"
import type { IdentityTokenRequest } from "./identityTokenRequestSchema.js"

export async function identityApiKeyLogin(
  data: IdentityTokenRequest,
  options: IdentityApiKeyLoginOptions,
): Promise<Result<IdentityApiKeyTokenResponse | IdentityOrganizationApiKeyTokenResponse>> {
  const op = "identityApiKeyLogin"
  const rateLimitResult = options.rateLimiter.check(options.clientIp)
  if (!rateLimitResult.success) return rateLimitResult
  if (data.scope === undefined) return identityDomainErrorCreate(op, "Missing scope")
  if (data.scope === "api") return identityPersonalApiKeyLogin(data, options)
  if (data.scope === "api.organization") return identityOrganizationApiKeyLogin(data, options)
  return identityDomainErrorCreate(op, "Scope not supported")
}
