import type { IdentitySsoAuthenticatedUser } from "./identitySsoAuthenticatedUserSchema.js"
import type { IdentitySsoCodeResponseError } from "./identitySsoCodeResponseErrorSchema.js"

export type IdentitySsoAuth = {
  state: string
  clientChallenge: string
  nonce: string
  redirectUri: string
  codeResponse: string | null
  codeResponseError: IdentitySsoCodeResponseError | null
  authResponse: IdentitySsoAuthenticatedUser | null
  createdAt: string
  updatedAt: string
  bindingHash: string | null
}
