import { expect, test } from "bun:test"
import { secureRandomBytes } from "../../../../src/shared/crypto/secureRandomBytes.js"

test("secureRandomBytes returns the requested number of bytes across Web Crypto chunks", () => {
  const result = secureRandomBytes(65_537)

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toHaveLength(65_537)
})

test("secureRandomBytes rejects invalid lengths as a Result error", () => {
  expect(secureRandomBytes(-1)).toMatchObject({ success: false, op: "secureRandomBytes" })
  expect(secureRandomBytes(1.5)).toMatchObject({ success: false, op: "secureRandomBytes" })
})
