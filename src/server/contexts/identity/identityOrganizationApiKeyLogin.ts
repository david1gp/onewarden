import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identityOrganizationApiKeyAccessTokenClaimsCreate } from "./identityOrganizationApiKeyAccessTokenClaimsCreate.js"
import { identityOrganizationApiKeyFindByOrganizationUuid } from "./identityOrganizationApiKeyFindByOrganizationUuid.js"
import type { IdentityOrganizationApiKeyTokenResponse } from "./identityOrganizationApiKeyTokenResponseSchema.js"
import type { IdentityTokenRequest } from "./identityTokenRequestSchema.js"

type IdentityOrganizationApiKeyLoginOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  issuer: string
  privateKey: KeyInput | undefined
}

export async function identityOrganizationApiKeyLogin(
  data: IdentityTokenRequest,
  options: IdentityOrganizationApiKeyLoginOptions,
): Promise<Result<IdentityOrganizationApiKeyTokenResponse>> {
  const op = "identityOrganizationApiKeyLogin"
  const database = options.database
  if (database === undefined) {
    return resultErrorCreate(op, "Identity database is unavailable.", { code: "platform.unavailable", statusCode: 503 })
  }
  const clientId = data.clientId
  if (clientId === undefined) return identityDomainErrorCreate(op, "client_id cannot be blank")
  const clientSecret = data.clientSecret
  if (clientSecret === undefined) return identityDomainErrorCreate(op, "client_secret cannot be blank")
  if (!clientId.startsWith("organization.")) return identityDomainErrorCreate(op, "Malformed client_id")

  const organizationUuid = clientId.slice("organization.".length)
  const apiKeyResult = identityOrganizationApiKeyFindByOrganizationUuid(database, organizationUuid)
  if (!apiKeyResult.success) return apiKeyResult
  if (apiKeyResult.data === null) return identityDomainErrorCreate(op, "Invalid client_id")
  const apiKey = apiKeyResult.data
  if (!constantTimeStringsEqual(apiKey.apiKey, clientSecret))
    return identityDomainErrorCreate(op, "Incorrect client_secret")
  if (options.privateKey === undefined) return resultErrorCreate(op, "Identity token signing is unavailable.")

  const now = Math.floor(options.clock.now().getTime() / 1_000)
  const claims = identityOrganizationApiKeyAccessTokenClaimsCreate(
    apiKey.uuid,
    apiKey.organizationUuid,
    options.issuer,
    now,
    now + 60 * 60,
  )
  const tokenResult = await jwtSign(claims, options.privateKey)
  if (!tokenResult.success) return resultErrorCreate(op, "Identity access token signing failed.")
  return resultCreate({
    access_token: tokenResult.data,
    expires_in: 3_600,
    token_type: "Bearer",
    scope: "api.organization",
  })
}
