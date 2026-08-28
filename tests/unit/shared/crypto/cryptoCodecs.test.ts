import { expect, test } from "bun:test"
import { base64Decode } from "../../../../src/shared/crypto/base64Decode.js"
import { base64Encode } from "../../../../src/shared/crypto/base64Encode.js"
import { base64UrlDecode } from "../../../../src/shared/crypto/base64UrlDecode.js"
import { base64UrlDecodePadded } from "../../../../src/shared/crypto/base64UrlDecodePadded.js"
import { base64UrlEncode } from "../../../../src/shared/crypto/base64UrlEncode.js"
import { base64UrlEncodePadded } from "../../../../src/shared/crypto/base64UrlEncodePadded.js"
import fixtures from "../../../fixtures/cryptoFixtures.json" with { type: "json" }

const bytes = new Uint8Array(fixtures.base64.bytes)

test("base64 codecs preserve protocol padding and alphabets", () => {
  expect(base64Encode(bytes)).toBe(fixtures.base64.standard)
  expect(base64UrlEncode(bytes)).toBe(fixtures.base64.url)
  expect(base64UrlEncodePadded(bytes)).toBe(fixtures.base64.urlPadded)
  expect(base64Decode(fixtures.base64.standard)).toEqual({ success: true, data: bytes })
  expect(base64UrlDecode(fixtures.base64.url)).toEqual({ success: true, data: bytes })
  expect(base64UrlDecodePadded(fixtures.base64.urlPadded)).toEqual({ success: true, data: bytes })
})

test("base64 decoders reject non-canonical and wrong-padding inputs", () => {
  expect(base64Decode("AAEC+/8").success).toBe(false)
  expect(base64Decode("AB==").success).toBe(false)
  expect(base64UrlDecode(`${fixtures.base64.url}=`).success).toBe(false)
  expect(base64UrlDecodePadded(fixtures.base64.url).success).toBe(false)
})

test("base64 codecs support empty byte sequences", () => {
  const empty = new Uint8Array()
  expect(base64Encode(empty)).toBe("")
  expect(base64UrlEncode(empty)).toBe("")
  expect(base64UrlEncodePadded(empty)).toBe("")
  expect(base64Decode("")).toEqual({ success: true, data: empty })
  expect(base64UrlDecode("")).toEqual({ success: true, data: empty })
  expect(base64UrlDecodePadded("")).toEqual({ success: true, data: empty })
})
