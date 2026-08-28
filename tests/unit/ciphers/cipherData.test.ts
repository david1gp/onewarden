import { expect, test } from "bun:test"
import { cipherDataPrepare } from "../../../src/server/contexts/ciphers/cipherDataPrepare.js"
import type { CipherData } from "../../../src/server/contexts/ciphers/cipherDataSchema.js"

test("cipher data preparation validates the type payload and removes response fields", () => {
  const data: CipherData = {
    type: 1,
    name: "Login",
    login: {
      response: "ignored",
      uris: [{ response: "ignored", uri: "https://example.com" }],
    },
  }

  const result = cipherDataPrepare(data)
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(JSON.parse(result.data.data)).toEqual({ uris: [{ uri: "https://example.com" }] })
})

test("cipher data preparation rejects missing or unsupported type data", () => {
  const missing = cipherDataPrepare({ type: 1, name: "Missing" })
  expect(missing.success).toBe(false)
  const unsupported = cipherDataPrepare({ type: 6, name: "Unsupported", login: {} })
  expect(unsupported.success).toBe(false)
})
