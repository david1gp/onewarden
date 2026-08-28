import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { sha256Hex } from "../../../shared/crypto/sha256Hex.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identitySsoAuthCreate } from "./identitySsoAuthCreate.js"
import { identitySsoAuthSave } from "./identitySsoAuthSave.js"
import type { IdentitySsoAdapter } from "./identitySsoAdapter.js"
import type { IdentitySsoAuthorizeData } from "./identitySsoAuthorizeDataSchema.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identitySsoRedirectUriResolve } from "./identitySsoRedirectUriResolve.js"

export async function identitySsoAuthorize(
  data: IdentitySsoAuthorizeData,
  options: {
    clock: Clock
    database: DatabaseConnection | undefined
    issuer: string
    sso: IdentitySsoAdapter
  },
): Promise<Result<{ authorizationUrl: string; bindingToken: string }>> {
  const op = "identitySsoAuthorize"
  const database = options.database
  if (database === undefined)
    return resultErrorCreate(op, "Identity database is unavailable.", { code: "platform.unavailable", statusCode: 503 })
  if (data.codeChallengeMethod !== "S256") return identityDomainErrorCreate(op, "Unsupported code challenge method")
  const redirectResult = identitySsoRedirectUriResolve(data.clientId, data.redirectUri, options.issuer)
  if (!redirectResult.success) return redirectResult
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
  )
  const saveResult = identitySsoAuthSave(database, auth)
  if (!saveResult.success) return saveResult
  return resultCreate({ authorizationUrl: authorizeResult.data.authorizationUrl, bindingToken })
}
