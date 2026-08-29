import * as v from "valibot"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationSsoConfig } from "../organizations/organizationSsoConfig.js"
import { organizationSsoConfigFindByOrganization } from "../organizations/organizationSsoConfigFindByOrganization.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentityConfig } from "./identityConfigSchema.js"

const identitySsoOrganizationDataSchema = v.object({
  authority: v.optional(v.string()),
  clientId: v.optional(v.string()),
  clientSecret: v.optional(v.string()),
  scopes: v.optional(v.string()),
  authorizeExtraParams: v.optional(v.string()),
  pkce: v.optional(v.boolean()),
  allowUnknownEmailVerification: v.optional(v.boolean()),
  signupsMatchEmail: v.optional(v.boolean()),
  authOnlyNotSession: v.optional(v.boolean()),
})

export async function identitySsoOrganizationConfigResolve(
  database: DatabaseConnection,
  organizationUuid: string,
  baseConfig: IdentityConfig,
): Promise<Result<IdentityConfig>> {
  const op = "identitySsoOrganizationConfigResolve"
  const configResult = organizationSsoConfigFindByOrganization(database, organizationUuid)
  if (!configResult.success) return configResult
  if (configResult.data === null) return identityDomainErrorCreate(op, "Organization SSO configuration not found")
  if (!configResult.data.enabled) return identityDomainErrorCreate(op, "Organization SSO is disabled")
  const dataResult = identitySsoOrganizationDataParse(configResult.data)
  if (!dataResult.success) return dataResult
  const data = dataResult.data
  if (data.authority === undefined || data.authority.trim() === "")
    return identityDomainErrorCreate(op, "Organization SSO authority is missing")
  if (data.clientId === undefined || data.clientId.trim() === "")
    return identityDomainErrorCreate(op, "Organization SSO client id is missing")
  let authority: URL
  try {
    authority = new URL(data.authority)
  } catch {
    return identityDomainErrorCreate(op, "Organization SSO authority is invalid")
  }
  if (authority.protocol !== "https:" && authority.protocol !== "http:")
    return identityDomainErrorCreate(op, "Organization SSO authority is invalid")
  return resultCreate({
    ...baseConfig,
    SSO_ALLOW_UNKNOWN_EMAIL_VERIFICATION:
      data.allowUnknownEmailVerification ?? baseConfig.SSO_ALLOW_UNKNOWN_EMAIL_VERIFICATION,
    SSO_AUTH_ONLY_NOT_SESSION: data.authOnlyNotSession ?? baseConfig.SSO_AUTH_ONLY_NOT_SESSION,
    SSO_AUTHORIZE_EXTRA_PARAMS: data.authorizeExtraParams ?? baseConfig.SSO_AUTHORIZE_EXTRA_PARAMS,
    SSO_AUTHORITY: authority.toString().replace(/\/$/u, ""),
    SSO_CLIENT_ID: data.clientId,
    SSO_CLIENT_SECRET: data.clientSecret ?? baseConfig.SSO_CLIENT_SECRET,
    SSO_PKCE: data.pkce ?? baseConfig.SSO_PKCE,
    SSO_SCOPES: data.scopes ?? baseConfig.SSO_SCOPES,
    SSO_SIGNUPS_MATCH_EMAIL: data.signupsMatchEmail ?? baseConfig.SSO_SIGNUPS_MATCH_EMAIL,
  })
}

function identitySsoOrganizationDataParse(
  config: OrganizationSsoConfig,
): Result<v.InferOutput<typeof identitySsoOrganizationDataSchema>> {
  const op = "identitySsoOrganizationDataParse"
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(config.data)
  } catch {
    return identityDomainErrorCreate(op, "Organization SSO configuration data is invalid")
  }
  const recordResult = v.safeParse(v.record(v.string(), v.unknown()), parsedJson)
  if (!recordResult.success) return identityDomainErrorCreate(op, "Organization SSO configuration data is invalid")
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(recordResult.output)) {
    const canonicalKey = identitySsoOrganizationDataKeyResolve(key)
    if (canonicalKey !== undefined) normalized[canonicalKey] = value
  }
  const dataResult = v.safeParse(identitySsoOrganizationDataSchema, normalized)
  if (!dataResult.success) return identityDomainErrorCreate(op, "Organization SSO configuration data is invalid")
  return resultCreate(dataResult.output)
}

function identitySsoOrganizationDataKeyResolve(
  key: string,
): keyof v.InferOutput<typeof identitySsoOrganizationDataSchema> | undefined {
  const normalized = key.replaceAll("_", "").replaceAll("-", "").toLowerCase()
  const keys: Record<string, keyof v.InferOutput<typeof identitySsoOrganizationDataSchema>> = {
    allowunknownemailverification: "allowUnknownEmailVerification",
    authonlynotsession: "authOnlyNotSession",
    authorizeextraparams: "authorizeExtraParams",
    authority: "authority",
    clientid: "clientId",
    clientsecret: "clientSecret",
    pkce: "pkce",
    scopes: "scopes",
    signupsmatchemail: "signupsMatchEmail",
  }
  return keys[normalized]
}
