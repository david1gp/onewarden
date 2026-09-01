import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { base64Decode } from "../../../shared/crypto/base64Decode.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import { sha256Hex } from "../../../shared/crypto/sha256Hex.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identitySsoAuthCallbackResponseSave } from "./identitySsoAuthCallbackResponseSave.js"
import { identitySsoAuthFindByState } from "./identitySsoAuthFindByState.js"

export async function identitySsoCallback(
  base64State: string,
  code: string,
  error: { error: string; errorDescription: string | null } | null,
  options: { clock: Clock; database: DatabaseConnection | undefined; issuer: string; bindingToken: string | undefined },
): Promise<Result<{ location: string }>> {
  const op = "identitySsoCallback"
  const database = options.database
  if (database === undefined)
    return resultErrorCreate(op, "Identity database is unavailable.", { code: "platform.unavailable", statusCode: 503 })
  const decodedStateResult = base64Decode(base64State)
  if (!decodedStateResult.success) return identityDomainErrorCreate(op, `Failed to decode ${base64State} using base64`)
  let state: string
  try {
    state = new TextDecoder("utf-8", { fatal: true }).decode(decodedStateResult.data)
  } catch {
    return identityDomainErrorCreate(op, `Invalid utf8 chars in ${base64State} after base64 decoding`)
  }
  const authResult = identitySsoAuthFindByState(database, state, options.clock)
  if (!authResult.success) return authResult
  if (authResult.data === null) return identityDomainErrorCreate(op, `Cannot retrieve sso_auth for ${state}`)
  const auth = authResult.data
  const bindingToken = options.bindingToken
  if (auth.bindingHash === null || bindingToken === undefined)
    return identityDomainErrorCreate(op, `SSO session binding mismatch for ${state}`)
  const bindingHashResult = await sha256Hex(bindingToken)
  if (!bindingHashResult.success || !constantTimeStringsEqual(auth.bindingHash, bindingHashResult.data))
    return identityDomainErrorCreate(op, `SSO session binding mismatch for ${state}`)
  auth.codeResponse = code
  auth.codeResponseError = error === null ? null : { error: error.error, error_description: error.errorDescription }
  auth.updatedAt = options.clock.now().toISOString()
  const saveResult = identitySsoAuthCallbackResponseSave(database, auth)
  if (!saveResult.success) return saveResult
  if (!saveResult.data) return identityDomainErrorCreate(op, `Cannot retrieve sso_auth for ${state}`)
  let redirect: URL
  try {
    redirect = new URL(auth.redirectUri)
  } catch {
    return identityDomainErrorCreate(op, `Failed to parse redirect uri (${auth.redirectUri})`)
  }
  redirect.searchParams.append("code", code)
  redirect.searchParams.append("state", state)
  redirect.searchParams.append("scope", "api offline_access")
  redirect.searchParams.append("iss", options.issuer)
  return resultCreate({ location: redirect.toString() })
}
