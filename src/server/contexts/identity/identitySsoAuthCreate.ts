import type { IdentitySsoAuth } from "./identitySsoAuth.js"

export function identitySsoAuthCreate(
  state: string,
  clientChallenge: string,
  nonce: string,
  redirectUri: string,
  now: string,
  bindingHash: string | null,
  organizationUuid: string | null = null,
): IdentitySsoAuth {
  return {
    state,
    clientChallenge,
    nonce,
    redirectUri,
    codeResponse: null,
    codeResponseError: null,
    authResponse: null,
    createdAt: now,
    updatedAt: now,
    bindingHash,
    ...(organizationUuid === null ? {} : { organizationUuid }),
  }
}
