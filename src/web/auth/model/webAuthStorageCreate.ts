import * as v from "valibot"
import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type WebAuthSession, webAuthSessionSchema } from "./webAuthSessionSchema.js"

const SESSION_STORAGE_KEY = "onewarden_web_auth_session"
const REMEMBERED_EMAIL_STORAGE_KEY = "onewarden_web_remembered_email"
const DEVICE_IDENTIFIER_STORAGE_KEY = "onewarden_web_device_identifier"
const REMEMBER_TOKEN_PREFIX = "onewarden_web_2fa_remember_"

export interface WebAuthStorageAdapter {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

function memoryStorageCreate(): WebAuthStorageAdapter {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

function defaultStorageResolve(): WebAuthStorageAdapter {
  if (typeof window !== "undefined" && window.localStorage !== undefined) {
    return window.localStorage
  }
  return memoryStorageCreate()
}

function randomDeviceIdentifierGenerate(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `web-${Math.random().toString(36).slice(2, 11)}`
}

export function webAuthStorageCreate(storageAdapter?: WebAuthStorageAdapter) {
  const storage = storageAdapter ?? defaultStorageResolve()

  const sessionSave = (session: WebAuthSession): Result<void> => {
    const op = "webAuthStorage.sessionSave"
    const parsed = v.safeParse(webAuthSessionSchema, session)
    if (!parsed.success) {
      return resultErrorCreate(op, "Invalid web auth session data.", {
        code: "platform.invalid-request",
        statusCode: 400,
        errorData: v.summarize(parsed.issues),
      })
    }
    try {
      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed.output))
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Failed to persist session to local storage.")
    }
  }

  const sessionLoad = (): Result<WebAuthSession | null> => {
    const op = "webAuthStorage.sessionLoad"
    let raw: string | null
    try {
      raw = storage.getItem(SESSION_STORAGE_KEY)
    } catch {
      return resultErrorCreate(op, "Failed to read session from local storage.")
    }
    if (raw === null || raw.trim() === "") {
      return resultCreate(null)
    }
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(raw)
    } catch {
      storage.removeItem(SESSION_STORAGE_KEY)
      return resultCreate(null)
    }
    const validated = v.safeParse(webAuthSessionSchema, parsedJson)
    if (!validated.success) {
      storage.removeItem(SESSION_STORAGE_KEY)
      return resultCreate(null)
    }
    return resultCreate(validated.output)
  }

  const sessionClear = (): Result<void> => {
    const op = "webAuthStorage.sessionClear"
    try {
      storage.removeItem(SESSION_STORAGE_KEY)
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Failed to clear session from local storage.")
    }
  }

  const rememberedEmailSave = (email: string | null): Result<void> => {
    const op = "webAuthStorage.rememberedEmailSave"
    try {
      if (email === null || email.trim() === "") {
        storage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY)
      } else {
        storage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, email.trim().toLowerCase())
      }
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Failed to persist remembered email.")
    }
  }

  const rememberedEmailLoad = (): Result<string | null> => {
    const op = "webAuthStorage.rememberedEmailLoad"
    try {
      const email = storage.getItem(REMEMBERED_EMAIL_STORAGE_KEY)
      if (email === null || email.trim() === "") {
        return resultCreate(null)
      }
      return resultCreate(email.trim().toLowerCase())
    } catch {
      return resultErrorCreate(op, "Failed to load remembered email.")
    }
  }

  const deviceIdentifierGet = (): string => {
    try {
      const existing = storage.getItem(DEVICE_IDENTIFIER_STORAGE_KEY)
      if (existing && existing.trim() !== "") {
        return existing.trim()
      }
      const generated = randomDeviceIdentifierGenerate()
      storage.setItem(DEVICE_IDENTIFIER_STORAGE_KEY, generated)
      return generated
    } catch {
      return "web-device-default"
    }
  }

  const rememberTokenSave = (email: string, token: string): Result<void> => {
    const op = "webAuthStorage.rememberTokenSave"
    try {
      const key = `${REMEMBER_TOKEN_PREFIX}${email.trim().toLowerCase()}`
      storage.setItem(key, token)
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Failed to persist 2FA remember token.")
    }
  }

  const rememberTokenLoad = (email: string): Result<string | null> => {
    const op = "webAuthStorage.rememberTokenLoad"
    try {
      const key = `${REMEMBER_TOKEN_PREFIX}${email.trim().toLowerCase()}`
      const token = storage.getItem(key)
      if (token === null || token.trim() === "") return resultCreate(null)
      return resultCreate(token.trim())
    } catch {
      return resultErrorCreate(op, "Failed to load 2FA remember token.")
    }
  }

  const rememberTokenClear = (email: string): Result<void> => {
    const op = "webAuthStorage.rememberTokenClear"
    try {
      const key = `${REMEMBER_TOKEN_PREFIX}${email.trim().toLowerCase()}`
      storage.removeItem(key)
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Failed to clear 2FA remember token.")
    }
  }

  return {
    sessionSave,
    sessionLoad,
    sessionClear,
    rememberedEmailSave,
    rememberedEmailLoad,
    deviceIdentifierGet,
    rememberTokenSave,
    rememberTokenLoad,
    rememberTokenClear,
  }
}
