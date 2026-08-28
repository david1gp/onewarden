import { expect, test } from "bun:test"
import { passwordHashCreate } from "../../../../src/shared/crypto/passwordHashCreate.js"
import { passwordHashVerify } from "../../../../src/shared/crypto/passwordHashVerify.js"
import fixtures from "../../../fixtures/cryptoFixtures.json"

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/.{1,2}/g) ?? [], (value) => Number.parseInt(value, 16))
}

test("passwordHashCreate uses Vaultwarden's PBKDF2-HMAC-SHA256 default", async () => {
  const hash = await passwordHashCreate(fixtures.passwordHash.password, new Uint8Array(fixtures.passwordHash.salt))

  expect(hash).toEqual({ success: true, data: hexToBytes(fixtures.passwordHash.defaultHex) })
})

test("passwordHashCreate preserves explicit iteration counts", async () => {
  const hash = await passwordHashCreate(
    fixtures.passwordHash.password,
    new TextEncoder().encode(fixtures.passwordHash.singleIterationSalt),
    1,
  )

  expect(hash).toEqual({ success: true, data: hexToBytes(fixtures.passwordHash.singleIterationHex) })
})

test("passwordHashVerify derives before constant-time comparison", async () => {
  const hash = hexToBytes(fixtures.passwordHash.defaultHex)
  const valid = await passwordHashVerify(
    fixtures.passwordHash.password,
    new Uint8Array(fixtures.passwordHash.salt),
    hash,
  )
  const invalid = await passwordHashVerify("wrong-password", new Uint8Array(fixtures.passwordHash.salt), hash)

  expect(valid).toEqual({ success: true, data: true })
  expect(invalid).toEqual({ success: true, data: false })
})

test("password hash rejects invalid iteration counts as a Result error", async () => {
  const result = await passwordHashCreate("password", new Uint8Array([1, 2, 3]), 0)

  expect(result).toMatchObject({ success: false, op: "passwordHashCreate" })
})
