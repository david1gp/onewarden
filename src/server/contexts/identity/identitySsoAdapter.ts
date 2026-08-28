import type { Result } from "#result"
import type { IdentitySsoAuth } from "./identitySsoAuth.js"
import type { IdentitySsoAuthenticatedUser } from "./identitySsoAuthenticatedUserSchema.js"

export type IdentitySsoAdapter = {
  authorize: (input: {
    clientId: string
    rawRedirectUri: string
    redirectUri: string
    state: string
    clientChallenge: string
  }) => Promise<Result<{ authorizationUrl: string; nonce: string }>>
  exchange: (input: {
    auth: IdentitySsoAuth
    code: string
    codeVerifier: string
  }) => Promise<Result<IdentitySsoAuthenticatedUser>>
  refresh?: (
    refreshToken: string,
  ) => Promise<Result<{ access_token: string; refresh_token: string | null; expires_in: number | null }>>
  validateAccessToken?: (accessToken: string) => Promise<Result<void>>
}
