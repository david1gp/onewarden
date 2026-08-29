import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { sha256Hex } from "../../../shared/crypto/sha256Hex.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationDomainFindOrganizationByVerifiedDomain } from "../organizations/organizationDomainFindOrganizationByVerifiedDomain.js"
import { identitySsoAuthCreate } from "./identitySsoAuthCreate.js"
import { identitySsoAuthSave } from "./identitySsoAuthSave.js"
import type { IdentitySsoAdapter } from "./identitySsoAdapter.js"
import type { IdentitySsoAuthorizeData } from "./identitySsoAuthorizeDataSchema.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityConfigCreate } from "./identityConfigCreate.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identitySsoOrganizationConfigResolve } from "./identitySsoOrganizationConfigResolve.js"
import { identitySsoRedirectUriResolve } from "./identitySsoRedirectUriResolve.js"

export async function identitySsoAuthorize(
  data: IdentitySsoAuthorizeData,
  options: {
    clock: Clock
    database: DatabaseConnection | undefined
    config?: IdentityConfig
    issuer: string
    sso: IdentitySsoAdapter
  },
): Promise<Result<{ authorizationUrl: string; bindingToken: string }>> {
  const op = "identitySsoAuthorize"
  const database = options.database
  const baseConfig = options.config ?? identityConfigCreate()
  if (database === undefined)
    return resultErrorCreate(op, "Identity database is unavailable.", { code: "platform.unavailable", statusCode: 503 })
  if (data.codeChallengeMethod !== "S256") return identityDomainErrorCreate(op, "Unsupported code challenge method")
  const redirectResult = identitySsoRedirectUriResolve(data.clientId, data.redirectUri, options.issuer)
  if (!redirectResult.success) return redirectResult
  let organizationUuid: string | null = null
  let organizationConfig: IdentityConfig | undefined
  if (data.domainHint !== undefined && data.domainHint.trim() !== "") {
    const domainHint = identitySsoDomainHintNormalize(data.domainHint)
    if (domainHint === undefined) return identityDomainErrorCreate(op, "Invalid domain hint")
    const organizationResult = organizationDomainFindOrganizationByVerifiedDomain(database, domainHint)
    if (!organizationResult.success) return organizationResult
    if (organizationResult.data !== null) {
      const configResult = await identitySsoOrganizationConfigResolve(database, organizationResult.data, baseConfig)
      if (!configResult.success) return configResult
      organizationUuid = organizationResult.data
      organizationConfig = configResult.data
    }
  }
  const randomResult = secureRandomBytes(32)
  if (!randomResult.success) return randomResult
  const bindingToken = base64UrlEncode(randomResult.data)
  const bindingHashResult = await sha256Hex(bindingToken)
  if (!bindingHashResult.success) return bindingHashResult
  const authorizeResult = await options.sso.authorize({
    clientId: data.clientId,
    rawRedirectUri: data.redirectUri,
    redirectUri: redirectResult.data,
    state: data.state,
    clientChallenge: data.codeChallenge,
    ...(organizationConfig === undefined ? {} : { configuration: organizationConfig }),
  })
  if (!authorizeResult.success) return authorizeResult
  const now = options.clock.now().toISOString()
  const auth = identitySsoAuthCreate(
    data.state,
    data.codeChallenge,
    authorizeResult.data.nonce,
    redirectResult.data,
    now,
    bindingHashResult.data,
    organizationUuid,
  )
  const saveResult = identitySsoAuthSave(database, auth)
  if (!saveResult.success) return saveResult
  return resultCreate({ authorizationUrl: authorizeResult.data.authorizationUrl, bindingToken })
}

function identitySsoDomainHintNormalize(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase()
  const at = trimmed.lastIndexOf("@")
  const domain = at === -1 ? trimmed : trimmed.slice(at + 1)
  if (domain.length === 0 || domain.includes("@")) return undefined
  if (domain.endsWith(".") || domain.includes("/") || domain.includes(":")) return undefined
  if (!domain.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label))) return undefined
  return domain
}
