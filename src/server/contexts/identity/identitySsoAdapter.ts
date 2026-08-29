import type { Result } from "#result"
import type { IdentitySsoAuth } from "./identitySsoAuth.js"
import type { IdentitySsoAuthenticatedUser } from "./identitySsoAuthenticatedUserSchema.js"
import type { IdentityConfig } from "./identityConfigSchema.js"

export type IdentitySsoAdapter = {
  authorize: (input: {
    clientId: string
    rawRedirectUri: string
    redirectUri: string
    state: string
    clientChallenge: string
    configuration?: IdentityConfig
  }) => Promise<Result<{ authorizationUrl: string; nonce: string }>>
  exchange: (input: {
    auth: IdentitySsoAuth
    code: string
    codeVerifier: string
    configuration?: IdentityConfig
  }) => Promise<Result<IdentitySsoAuthenticatedUser>>
  refresh?: (
    refreshToken: string,
    configuration?: IdentityConfig,
  ) => Promise<Result<{ access_token: string; refresh_token: string | null; expires_in: number | null }>>
  validateAccessToken?: (accessToken: string, configuration?: IdentityConfig) => Promise<Result<void>>
}
