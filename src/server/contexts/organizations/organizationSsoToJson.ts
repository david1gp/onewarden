import type { Organization } from "./organization.js"
import type { OrganizationSsoConfig } from "./organizationSsoConfig.js"

export function organizationSsoToJson(
  organization: Organization,
  config: OrganizationSsoConfig | null,
  publicOrigin: string | undefined,
): Record<string, unknown> {
  return {
    Enabled: config?.enabled ?? false,
    Identifier: organization.identifier,
    Data: config === null ? null : organizationSsoDataToJson(config.data),
    Urls: organizationSsoUrlsCreate(organization.uuid, publicOrigin),
    object: "organizationSso",
  }
}

function organizationSsoDataToJson(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, entry]) => [
        key.length === 0 ? key : key[0]!.toUpperCase() + key.slice(1),
        entry,
      ]),
    )
  } catch {
    return null
  }
}

function organizationSsoUrlsCreate(organizationUuid: string, publicOrigin: string | undefined): Record<string, string> {
  const origin = publicOrigin?.replace(/\/+$/, "") ?? ""
  const samlPath = `${origin}/saml2`
  return {
    CallbackPath: `${origin}/oidc-signin`,
    SignedOutCallbackPath: `${origin}/oidc-signedout`,
    SpEntityIdStatic: samlPath,
    SpEntityId: `${samlPath}/${organizationUuid}`,
    SpMetadataUrl: `${samlPath}/${organizationUuid}`,
    SpAcsUrl: `${samlPath}/${organizationUuid}/Acs`,
  }
}
