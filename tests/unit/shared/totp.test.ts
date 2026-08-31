import { expect, test } from "bun:test"
import { base32Decode } from "../../../src/shared/crypto/base32Decode.js"
import { base32Encode } from "../../../src/shared/crypto/base32Encode.js"
import { totpCodeCreate } from "../../../src/shared/totp/totpCodeCreate.js"
import { totpSecretParse } from "../../../src/shared/totp/totpSecretParse.js"
import fixtures from "../../fixtures/totpFixtures.json"

test("shared Base32 codecs accept canonical padding and reject non-zero trailing bits", () => {
  for (const fixture of fixtures.base32) {
    expect(base32Decode(fixture.encoded)).toEqual({ success: true, data: Uint8Array.from(fixture.bytes) })
    expect(base32Decode(fixture.padded)).toEqual({ success: true, data: Uint8Array.from(fixture.bytes) })
    expect(base32Encode(Uint8Array.from(fixture.bytes))).toBe(fixture.encoded)
  }
  expect(base32Decode(" m z x w 6 ")).toEqual({ success: true, data: Uint8Array.from([102, 111, 111]) })
  expect(base32Decode("MZ")).toMatchObject({ success: false })
  expect(base32Decode("MY=====")).toMatchObject({ success: false })
})

test("shared TOTP generation matches RFC 6238 SHA-1, SHA-256, and SHA-512 vectors", async () => {
  for (const fixture of fixtures.rfc6238) {
    const uri = `otpauth://totp/RFC?secret=${fixture.secret}&algorithm=${fixture.algorithm.replace("-", "")}&digits=8&period=30`
    expect(await totpCodeCreate(uri, fixture.timeSeconds)).toEqual({ success: true, data: fixture.code })
  }
})

test("shared TOTP generation supports raw six-digit seeds and rollover-safe custom periods", async () => {
  const rawResult = await totpCodeCreate(fixtures.rfc6238[0]!.secret, 59)
  expect(rawResult).toEqual({ success: true, data: "287082" })

  const custom = fixtures.customUri
  expect(await totpCodeCreate(custom.uri, custom.beforeRollover.timeSeconds)).toEqual({
    success: true,
    data: custom.beforeRollover.code,
  })
  expect(await totpCodeCreate(custom.uri, custom.afterRollover.timeSeconds)).toEqual({
    success: true,
    data: custom.afterRollover.code,
  })
})

test("shared TOTP URI parsing rejects unsupported modes and malformed configuration", () => {
  expect(totpSecretParse("otpauth://hotp/RFC?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ")).toMatchObject({
    success: false,
  })
  expect(totpSecretParse("otpauth://totp/RFC?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&algorithm=MD5")).toMatchObject({
    success: false,
  })
  expect(totpSecretParse("otpauth://totp/RFC?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&digits=7")).toMatchObject({
    success: false,
  })
  expect(totpSecretParse("otpauth://totp/RFC?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&period=0")).toMatchObject({
    success: false,
  })
})
