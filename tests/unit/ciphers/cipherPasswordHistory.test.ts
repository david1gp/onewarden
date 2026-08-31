import { expect, test } from "bun:test"
import { cipherPasswordHistoryNormalize } from "../../../src/server/contexts/ciphers/cipherPasswordHistoryNormalize.js"
import { cipherPasswordHistoryValidate } from "../../../src/server/contexts/ciphers/cipherPasswordHistoryValidate.js"

test("cipher password history output drops invalid entries and normalizes dates", () => {
  const result = cipherPasswordHistoryNormalize(
    JSON.stringify([
      { password: "old", lastUsedDate: "2026-08-28T00:00:00.123Z" },
      { password: null, lastUsedDate: "2026-08-28T00:00:00.123Z" },
      { password: "offset", lastUsedDate: "2026-08-28T01:00:00.123456+01:00" },
      { password: "invalid date", lastUsedDate: "2026-02-30T00:00:00Z" },
      { password: "missing date" },
      { note: "missing password" },
    ]),
  )

  expect(result).toEqual([
    { password: "old", lastUsedDate: "2026-08-28T00:00:00.123000Z" },
    { password: "offset", lastUsedDate: "2026-08-28T01:00:00.123456+01:00" },
    { password: "invalid date", lastUsedDate: "1970-01-01T00:00:00.000000Z" },
    { password: "missing date", lastUsedDate: "1970-01-01T00:00:00.000000Z" },
  ])
})

test("cipher password history import validation rejects non-string passwords", () => {
  const invalid = cipherPasswordHistoryValidate([{ password: null }], 2)
  expect(invalid).toMatchObject({
    success: false,
    errorMessage: "The model state is invalid.",
    errorData: JSON.stringify({
      "Ciphers[2].Notes": ["The password history contains a `null` value. Only strings are allowed."],
    }),
  })
  expect(
    cipherPasswordHistoryValidate([{ password: "valid", lastUsedDate: "2026-08-28T00:00:00.000Z" }], 0).success,
  ).toBe(true)
})

test("cipher password history import validation rejects invalid or missing dates", () => {
  expect(cipherPasswordHistoryValidate([{ password: "invalid", lastUsedDate: "invalid" }], 0).success).toBe(false)
  expect(cipherPasswordHistoryValidate([{ password: "missing" }], 0).success).toBe(false)
})
