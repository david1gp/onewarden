import { expect, test } from "bun:test"
import { effLongWordList } from "../../../../src/shared/crypto/effLongWordList.js"
import { passphraseGenerate } from "../../../../src/shared/crypto/passphraseGenerate.js"

test("effLongWordList contains the complete EFF long word list", () => {
  expect(effLongWordList).toHaveLength(7776)
  expect(effLongWordList[0]).toBe("abacus")
  expect(effLongWordList.at(-1)).toBe("zoom")
  expect(effLongWordList.every((word) => word.length > 0)).toBe(true)
})

test("passphraseGenerate uses the required defaults", () => {
  const result = passphraseGenerate()

  expect(result.success).toBe(true)
  if (!result.success) return

  expect(result.data).toContain("-")
  expect(result.data.match(/\d/g)).toHaveLength(1)
  expect(result.data.split("-").length).toBeGreaterThanOrEqual(3)
})

test("passphraseGenerate supports the word and separator constraints", () => {
  const result = passphraseGenerate({ numWords: 20, wordSeparator: "|", includeNumber: false })

  expect(result.success).toBe(true)
  if (!result.success) return

  const words = result.data.split("|")
  expect(words).toHaveLength(20)
  expect(words.every((word) => effLongWordList.includes(word as (typeof effLongWordList)[number]))).toBe(true)
})

test("passphraseGenerate appends exactly one digit when enabled", () => {
  const result = passphraseGenerate({ numWords: 3, wordSeparator: "|", includeNumber: true })

  expect(result.success).toBe(true)
  if (!result.success) return

  const words = result.data.split("|")
  const wordsWithoutOptionalDigit = words.map((word) => word.replace(/\d$/, ""))
  expect(words.filter((word) => /\d/.test(word))).toHaveLength(1)
  expect(words.every((word) => /^\D+$/.test(word) || /^\D+\d$/.test(word))).toBe(true)
  expect(
    wordsWithoutOptionalDigit.every((word) => effLongWordList.includes(word as (typeof effLongWordList)[number])),
  ).toBe(true)
})

test("passphraseGenerate rejects invalid options", () => {
  expect(passphraseGenerate({ numWords: 2 })).toMatchObject({ success: false, op: "passphraseGenerate" })
  expect(passphraseGenerate({ numWords: 21 })).toMatchObject({ success: false, op: "passphraseGenerate" })
  expect(passphraseGenerate({ numWords: 3.5 })).toMatchObject({ success: false, op: "passphraseGenerate" })
  expect(passphraseGenerate({ wordSeparator: "--" })).toMatchObject({ success: false, op: "passphraseGenerate" })
})

test("passphraseGenerate supports an empty separator and no number", () => {
  const result = passphraseGenerate({ numWords: 3, wordSeparator: "", includeNumber: false })

  expect(result.success).toBe(true)
  if (!result.success) return

  expect(result.data).not.toMatch(/\d/)
  expect(result.data.length).toBeGreaterThan(0)
})
