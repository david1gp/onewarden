import { beforeEach, expect, test } from "bun:test"
import { webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"

beforeEach(() => {
  if (typeof window !== "undefined" && window.localStorage !== undefined) {
    window.localStorage.clear()
  }
})

test("webAuthStorage saves, loads, and clears session and remembered email", () => {
  const storage = webAuthStorageCreate()

  expect(storage.sessionLoad()).toEqual({ success: true, data: null })
  expect(storage.rememberedEmailLoad()).toEqual({ success: true, data: null })

  const session = {
    email: "user@example.com",
    accessToken: "jwt-access-token",
    refreshToken: "refresh-token",
    tokenType: "Bearer" as const,
    expiresAt: Date.now() + 3600_000,
    userId: "user-123",
    kdf: 0,
    kdfIterations: 600_000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: "2.iv|ciphertext|mac",
  }

  expect(storage.sessionSave(session)).toEqual({ success: true, data: undefined })
  expect(storage.sessionLoad()).toEqual({ success: true, data: session })

  expect(storage.rememberedEmailSave("user@example.com")).toEqual({ success: true, data: undefined })
  expect(storage.rememberedEmailLoad()).toEqual({ success: true, data: "user@example.com" })

  expect(storage.sessionClear()).toEqual({ success: true, data: undefined })
  expect(storage.sessionLoad()).toEqual({ success: true, data: null })

  expect(storage.rememberedEmailSave(null)).toEqual({ success: true, data: undefined })
  expect(storage.rememberedEmailLoad()).toEqual({ success: true, data: null })
})
