import * as v from "valibot"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type WebSsoPendingSetup, webSsoPendingSetupSchema } from "./webSsoPendingSetupSchema.js"
import type { WebSsoStorageAdapter } from "./webSsoStorageAdapter.js"

/**
 * Tab-scoped storage for the pending SSO first-login master-password setup.
 *
 * `sessionStorage` is used deliberately: the held access/refresh token must not be visible to other
 * tabs and must not survive the tab that started the flow.
 */
const WEB_SSO_PENDING_SETUP_STORAGE_KEY = "onewarden_web_sso_pending_setup"

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

export function webSsoPendingSetupStorageCreate(storageAdapter?: WebSsoStorageAdapter | null) {
  const storage = storageAdapter === undefined ? defaultStorageResolve() : storageAdapter

  const clear = (): Result<void> => {
    const op = "webSsoPendingSetupStorage.clear"
    if (storage === null) return storageUnavailableResult(op)
    try {
      storage.removeItem(WEB_SSO_PENDING_SETUP_STORAGE_KEY)
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Failed to clear the pending SSO setup.")
    }
  }

  const save = (pending: WebSsoPendingSetup): Result<void> => {
    const op = "webSsoPendingSetupStorage.save"
    if (storage === null) return storageUnavailableResult(op)
    const parsed = v.safeParse(webSsoPendingSetupSchema, pending)
    if (!parsed.success) {
      return resultErrorCreate(op, "Invalid pending SSO setup.", {
        code: "platform.invalid-request",
        statusCode: 400,
        errorData: v.summarize(parsed.issues),
      })
    }
    try {
      storage.setItem(WEB_SSO_PENDING_SETUP_STORAGE_KEY, JSON.stringify(parsed.output))
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Failed to persist the pending SSO setup.")
    }
  }

  /** Returns the pending setup, or `null` when absent, malformed, or expired. */
  const load = (nowMs: number): Result<WebSsoPendingSetup | null> => {
    const op = "webSsoPendingSetupStorage.load"
    if (storage === null) return storageUnavailableResult(op)
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
      return resultErrorCreate(op, "Invalid current time.", { code: "platform.invalid-request", statusCode: 400 })
    }
    let raw: string | null
    try {
      raw = storage.getItem(WEB_SSO_PENDING_SETUP_STORAGE_KEY)
    } catch {
      return resultErrorCreate(op, "Failed to read the pending SSO setup.")
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

    const parsed = v.safeParse(webSsoPendingSetupSchema, json)
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

export type WebSsoPendingSetupStorage = ReturnType<typeof webSsoPendingSetupStorageCreate>
