import type { Result } from "#result"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { webSsoCodeChallengeCreate } from "./webSsoCodeChallengeCreate.js"
import { webSsoConnectorPath } from "./webSsoConnectorPath.js"
import type { WebSsoTransaction } from "./webSsoTransactionSchema.js"
import { webSsoTransactionTtlMs } from "./webSsoTransactionTtlMs.js"

const WEB_SSO_AUTHORIZE_PATH = "/identity/connect/authorize"

/**
 * Builds the same-origin PKCE authorization request for the browser SSO flow.
 *
 * `state` and the PKCE verifier are two independent 256-bit random values; only the S256 challenge
 * is placed in the URL. The returned transaction must be stored tab-scoped before navigating.
 */
export async function webSsoAuthorizationCreate(options: {
  origin: string
  nowMs: number
  email?: string
  ssoToken?: string
}): Promise<Result<{ authorizationUrl: string; transaction: WebSsoTransaction }>> {
  const op = "webSsoAuthorizationCreate"

  let origin: URL
  try {
    origin = new URL(options.origin)
  } catch {
    return resultErrorCreate(op, "Invalid application origin.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (
    (origin.protocol !== "https:" &&
      (origin.protocol !== "http:" ||
        (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname.toLowerCase()) &&
          !origin.hostname.toLowerCase().endsWith(".localhost")))) ||
    origin.username !== "" ||
    origin.password !== "" ||
    origin.pathname !== "/" ||
    origin.search !== "" ||
    origin.hash !== ""
  ) {
    return resultErrorCreate(op, "Invalid application origin.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (!Number.isSafeInteger(options.nowMs) || options.nowMs < 0) {
    return resultErrorCreate(op, "Invalid current time.", { code: "platform.invalid-request", statusCode: 400 })
  }
  if (options.nowMs > Number.MAX_SAFE_INTEGER - webSsoTransactionTtlMs) {
    return resultErrorCreate(op, "Invalid current time.", { code: "platform.invalid-request", statusCode: 400 })
  }

  const stateBytes = secureRandomBytes(32)
  if (!stateBytes.success) return stateBytes
  const verifierBytes = secureRandomBytes(32)
  if (!verifierBytes.success) return verifierBytes

  const state = base64UrlEncode(stateBytes.data)
  const codeVerifier = base64UrlEncode(verifierBytes.data)
  const challengeResult = await webSsoCodeChallengeCreate(codeVerifier)
  if (!challengeResult.success) return challengeResult

  const redirectUri = new URL(webSsoConnectorPath, origin.origin).toString()
  const authorizationUrl = new URL(WEB_SSO_AUTHORIZE_PATH, origin.origin)
  authorizationUrl.searchParams.set("client_id", "web")
  authorizationUrl.searchParams.set("redirect_uri", redirectUri)
  authorizationUrl.searchParams.set("response_type", "code")
  authorizationUrl.searchParams.set("scope", "api offline_access")
  authorizationUrl.searchParams.set("state", state)
  authorizationUrl.searchParams.set("code_challenge", challengeResult.data)
  authorizationUrl.searchParams.set("code_challenge_method", "S256")
  authorizationUrl.searchParams.set("response_mode", "query")
  const email = typeof options.email === "string" ? options.email.trim().toLowerCase() : undefined
  if (email !== undefined && email !== "") {
    if (email.length > 256) {
      return resultErrorCreate(op, "Invalid email hint.", { code: "platform.invalid-request", statusCode: 400 })
    }
    authorizationUrl.searchParams.set("domain_hint", email)
  }

  const transaction: WebSsoTransaction = {
    state,
    codeVerifier,
    clientId: "web",
    redirectUri,
    createdAt: options.nowMs,
    expiresAt: options.nowMs + webSsoTransactionTtlMs,
    ...(email === undefined || email === "" ? {} : { email }),
  }

  return resultCreate({ authorizationUrl: authorizationUrl.toString(), transaction })
}
