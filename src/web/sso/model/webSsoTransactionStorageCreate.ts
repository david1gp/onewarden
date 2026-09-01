import * as v from "valibot"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { WebSsoStorageAdapter } from "./webSsoStorageAdapter.js"
import { type WebSsoTransaction, webSsoTransactionSchema } from "./webSsoTransactionSchema.js"

export type { WebSsoStorageAdapter } from "./webSsoStorageAdapter.js"

/**
 * Tab-scoped storage for the pending SSO transaction.
 *
 * `sessionStorage` is used deliberately: the transaction (which holds the PKCE verifier) must not
 * be visible to other tabs or survive the tab that started the flow.
 */
const WEB_SSO_TRANSACTION_STORAGE_KEY = "onewarden_web_sso_transaction"

function defaultStorageResolve(): WebSsoStorageAdapter | null {
  try {
    if (typeof window !== "undefined" && window.sessionStorage !== undefined) return window.sessionStorage
  } catch {
    // Session storage can be unavailable in privacy-restricted browser contexts.
  }
  return null
}

function storageUnavailableResult(op: string) {
  return resultErrorCreate(op, "Session storage is unavailable.", { code: "platform.unavailable", statusCode: 503 })
}

export function webSsoTransactionStorageCreate(storageAdapter?: WebSsoStorageAdapter | null) {
  const storage = storageAdapter === undefined ? defaultStorageResolve() : storageAdapter

  const clear = (): Result<void> => {
    const op = "webSsoTransactionStorage.clear"
    if (storage === null) return storageUnavailableResult(op)
    try {
      storage.removeItem(WEB_SSO_TRANSACTION_STORAGE_KEY)
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Failed to clear the SSO transaction.")
    }
  }

  const save = (transaction: WebSsoTransaction): Result<void> => {
    const op = "webSsoTransactionStorage.save"
    if (storage === null) return storageUnavailableResult(op)
    const parsed = v.safeParse(webSsoTransactionSchema, transaction)
    if (!parsed.success) {
      return resultErrorCreate(op, "Invalid SSO transaction.", {
        code: "platform.invalid-request",
        statusCode: 400,
        errorData: v.summarize(parsed.issues),
      })
    }
    try {
      storage.setItem(WEB_SSO_TRANSACTION_STORAGE_KEY, JSON.stringify(parsed.output))
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Failed to persist the SSO transaction.")
    }
  }

  /** Returns the pending transaction, or `null` when absent, malformed, or expired. */
  const load = (nowMs: number): Result<WebSsoTransaction | null> => {
    const op = "webSsoTransactionStorage.load"
    if (storage === null) return storageUnavailableResult(op)
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
      return resultErrorCreate(op, "Invalid current time.", { code: "platform.invalid-request", statusCode: 400 })
    }
    let raw: string | null
    try {
      raw = storage.getItem(WEB_SSO_TRANSACTION_STORAGE_KEY)
    } catch {
      return resultErrorCreate(op, "Failed to read the SSO transaction.")
    }
    if (raw === null || raw.trim() === "") return resultCreate(null)

    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      const clearResult = clear()
      if (!clearResult.success) return clearResult
      return resultCreate(null)
    }

    const parsed = v.safeParse(webSsoTransactionSchema, json)
    if (!parsed.success) {
      const clearResult = clear()
      if (!clearResult.success) return clearResult
      return resultCreate(null)
    }
    if (parsed.output.createdAt > nowMs || parsed.output.expiresAt <= nowMs) {
      const clearResult = clear()
      if (!clearResult.success) return clearResult
      return resultCreate(null)
    }
    return resultCreate(parsed.output)
  }

  return { save, load, clear }
}

export type WebSsoTransactionStorage = ReturnType<typeof webSsoTransactionStorageCreate>
