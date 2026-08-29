import type { IdentityOrganizationApiKey } from "../identity/identityOrganizationApiKey.js"

export function organizationApiKeyToJson(apiKey: IdentityOrganizationApiKey): {
  apiKey: string
  revisionDate: string
  object: "apiKey"
} {
  return {
    apiKey: apiKey.apiKey,
    revisionDate: apiKey.revisionDate,
    object: "apiKey",
  }
}
