import { expect, test } from "bun:test"
import { hmacSha256Digest } from "../../../../src/shared/crypto/hmacSha256Digest.js"
import { hmacSha256Hex } from "../../../../src/shared/crypto/hmacSha256Hex.js"
import { sha256Digest } from "../../../../src/shared/crypto/sha256Digest.js"
import { sha256Hex } from "../../../../src/shared/crypto/sha256Hex.js"
import fixtures from "../../../fixtures/cryptoFixtures.json" with { type: "json" }

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/.{1,2}/g) ?? [], (value) => Number.parseInt(value, 16))
}

test("SHA-256 returns deterministic raw and lowercase hexadecimal output", async () => {
  const digest = await sha256Digest(fixtures.sha256.input)
  const hex = await sha256Hex(fixtures.sha256.input)

  expect(digest).toEqual({ success: true, data: hexToBytes(fixtures.sha256.hex) })
  expect(hex).toEqual({ success: true, data: fixtures.sha256.hex })
})

test("HMAC-SHA256 returns deterministic raw and lowercase hexadecimal output", async () => {
  const digest = await hmacSha256Digest(fixtures.hmacSha256.key, fixtures.hmacSha256.input)
  const hex = await hmacSha256Hex(fixtures.hmacSha256.key, fixtures.hmacSha256.input)

  expect(digest).toEqual({ success: true, data: hexToBytes(fixtures.hmacSha256.hex) })
  expect(hex).toEqual({ success: true, data: fixtures.hmacSha256.hex })
})
