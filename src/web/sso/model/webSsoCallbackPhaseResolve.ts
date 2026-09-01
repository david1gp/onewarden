import * as v from "valibot"
import type { Result } from "#result"
import { constantTimeTextEqual } from "../../../shared/crypto/constantTimeTextEqual.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { webSsoConnectorPath } from "./webSsoConnectorPath.js"
import type { WebSsoTransaction } from "./webSsoTransactionSchema.js"
import { webSsoTransactionSchema } from "./webSsoTransactionSchema.js"

const callbackQueryKeys = new Set(["code", "iss", "scope", "state"])

type WebSsoCallbackPhase = {
  phase: "code"
  code: string
  state: string
  transaction: WebSsoTransaction
}

function callbackInvalidResult(op: string): Result<never> {
  return resultErrorCreate(op, "Invalid SSO callback.", { code: "platform.invalid-request", statusCode: 400 })
}

function originResolve(op: string, value: string): Result<URL> {
  let origin: URL
  try {
    origin = new URL(value)
  } catch {
    return callbackInvalidResult(op)
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
    return callbackInvalidResult(op)
  }
  return resultCreate(origin)
}

function callbackUrlResolve(op: string, callbackUrl: string | URL, origin: URL): Result<URL> {
  let url: URL
  try {
    url = new URL(callbackUrl.toString())
  } catch {
    return callbackInvalidResult(op)
  }
  if (
    url.origin !== origin.origin ||
    url.pathname !== webSsoConnectorPath ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== "" ||
    /%(?![0-9a-f]{2})/iu.test(url.search)
  ) {
    return callbackInvalidResult(op)
  }
  return resultCreate(url)
}

function callbackQueryRead(op: string, url: URL): Result<Record<string, string>> {
  const values: Record<string, string> = {}
  const rawQuery = url.search.slice(1)
  if (rawQuery === "" || rawQuery.split("&").some((part) => part === "") || /%(?![0-9a-f]{2})/iu.test(rawQuery)) {
    return callbackInvalidResult(op)
  }
  for (const [key, value] of url.searchParams.entries()) {
    if (!callbackQueryKeys.has(key) || values[key] !== undefined || value === "" || value.length > 2_048)
      return callbackInvalidResult(op)
    values[key] = value
  }
  return resultCreate(values)
}

/** Validates the browser connector callback and resolves its backend-restored authorization code. */
export function webSsoCallbackPhaseResolve(options: {
  callbackUrl: string | URL
  origin: string
  nowMs: number
  transaction: WebSsoTransaction | null
}): Result<WebSsoCallbackPhase> {
  const op = "webSsoCallbackPhaseResolve"
  if (!Number.isSafeInteger(options.nowMs) || options.nowMs < 0) return callbackInvalidResult(op)

  const originResult = originResolve(op, options.origin)
  if (!originResult.success) return originResult
  const callbackResult = callbackUrlResolve(op, options.callbackUrl, originResult.data)
  if (!callbackResult.success) return callbackResult
  const queryResult = callbackQueryRead(op, callbackResult.data)
  if (!queryResult.success) return queryResult
  const query = queryResult.data

  const transactionResult = v.safeParse(webSsoTransactionSchema, options.transaction)
  if (!transactionResult.success || options.transaction === null) {
    return resultErrorCreate(op, "No pending SSO transaction.", { code: "platform.unauthorized", statusCode: 401 })
  }
  const transaction = transactionResult.output
  const expectedRedirectUri = new URL(webSsoConnectorPath, originResult.data.origin).toString()
  if (
    transaction.redirectUri !== expectedRedirectUri ||
    transaction.createdAt > options.nowMs ||
    transaction.expiresAt <= options.nowMs
  ) {
    return resultErrorCreate(op, "The SSO transaction is expired.", { code: "platform.unauthorized", statusCode: 401 })
  }

  const state = query.state
  if (state === undefined || !constantTimeTextEqual(state, transaction.state)) {
    return resultErrorCreate(op, "The SSO callback state did not match.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }
  const code = query.code
  if (code === undefined) return callbackInvalidResult(op)
  if (query.scope !== "api offline_access") return callbackInvalidResult(op)
  if (query.iss !== originResult.data.origin) return callbackInvalidResult(op)
  return resultCreate({ phase: "code", code, state, transaction })
}
