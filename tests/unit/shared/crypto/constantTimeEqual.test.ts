import { expect, test } from "bun:test"
import { constantTimeBytesEqual } from "../../../../src/shared/crypto/constantTimeBytesEqual.js"
import { constantTimeStringsEqual } from "../../../../src/shared/crypto/constantTimeStringsEqual.js"

test("constant-time byte comparison handles equal, different, and empty values", () => {
  expect(constantTimeBytesEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true)
  expect(constantTimeBytesEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false)
  expect(constantTimeBytesEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2]))).toBe(false)
  expect(constantTimeBytesEqual(new Uint8Array(), new Uint8Array())).toBe(true)
})

test("constant-time string comparison uses UTF-8 bytes", () => {
  expect(constantTimeStringsEqual("pāssword", "pāssword")).toBe(true)
  expect(constantTimeStringsEqual("pāssword", "password")).toBe(false)
  expect(constantTimeStringsEqual("", "")).toBe(true)
})
