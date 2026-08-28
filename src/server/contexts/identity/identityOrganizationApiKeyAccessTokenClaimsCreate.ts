import type { IdentityOrganizationApiKeyAccessTokenClaims } from "./identityOrganizationApiKeyAccessTokenClaimsSchema.js"

export function identityOrganizationApiKeyAccessTokenClaimsCreate(
  apiKeyUuid: string,
  organizationUuid: string,
  issuer: string,
  nbf: number,
  exp: number,
): IdentityOrganizationApiKeyAccessTokenClaims {
  return {
    nbf,
    exp,
    iss: `${issuer}|api.organization`,
    sub: apiKeyUuid,
    client_id: `organization.${organizationUuid}`,
    client_sub: organizationUuid,
    scope: ["api.organization"],
  }
}
