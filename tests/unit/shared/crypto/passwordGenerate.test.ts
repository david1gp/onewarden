import { expect, test } from "bun:test"
import { passwordGenerate } from "../../../../src/shared/crypto/passwordGenerate.js"

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const NUMBERS = "0123456789"
const SYMBOLS = "!@#$%^&*()_+-="
const ALL_CHARACTERS = `${LOWERCASE}${UPPERCASE}${NUMBERS}${SYMBOLS}`

test("passwordGenerate preserves the editor default policy and guarantees every character group", () => {
  const result = passwordGenerate()

  expect(result.success).toBe(true)
  if (!result.success) return

  expect(result.data).toHaveLength(20)
  expect([...result.data].every((character) => ALL_CHARACTERS.includes(character))).toBe(true)
  expect(result.data).toMatch(/[a-z]/)
  expect(result.data).toMatch(/[A-Z]/)
  expect(result.data).toMatch(/[0-9]/)
  expect(result.data).toMatch(/[!@#$%^&*()_+\-=]/)
})

test("passwordGenerate supports custom lengths and character policies", () => {
  const result = passwordGenerate({
    length: 32,
    characterPolicy: { lowercase: false, uppercase: true, numbers: true, symbols: false },
  })

  expect(result.success).toBe(true)
  if (!result.success) return

  expect(result.data).toHaveLength(32)
  expect(result.data).toMatch(/^[A-Z0-9]+$/)
  expect(result.data).toMatch(/[A-Z]/)
  expect(result.data).toMatch(/[0-9]/)
})

test("passwordGenerate supports a single character policy at the minimum length", () => {
  const result = passwordGenerate({
    length: 1,
    characterPolicy: { lowercase: false, uppercase: false, numbers: true, symbols: false },
  })

  expect(result).toEqual({ success: true, data: expect.stringMatching(/^[0-9]$/) })
})

test("passwordGenerate rejects unsupported lengths and policies", () => {
  expect(passwordGenerate({ length: 0 })).toMatchObject({ success: false, op: "passwordGenerate" })
  expect(passwordGenerate({ length: 129 })).toMatchObject({ success: false, op: "passwordGenerate" })
  expect(
    passwordGenerate({
      length: 3,
      characterPolicy: { lowercase: true, uppercase: true, numbers: true, symbols: true },
    }),
  ).toMatchObject({
    success: false,
    op: "passwordGenerate",
  })
  expect(
    passwordGenerate({
      characterPolicy: { lowercase: false, uppercase: false, numbers: false, symbols: false },
    }),
  ).toMatchObject({ success: false, op: "passwordGenerate" })
})
