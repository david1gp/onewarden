import { expect, test } from "bun:test"
import { bitwardenAttachmentBinaryDecrypt } from "../../../../src/shared/crypto/bitwardenAttachmentBinaryDecrypt.js"

const key = Uint8Array.from({ length: 64 }, (_, index) => index)
const plaintext = Uint8Array.from([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
  0, 255, 128, 64, 127,
])
const encrypted = Uint8Array.from([
  2, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 127, 138, 55, 48, 121, 63, 75, 180,
  17, 231, 166, 21, 173, 98, 50, 126, 162, 217, 24, 141, 182, 136, 204, 58, 167, 221, 169, 66, 98, 144, 121, 125, 34,
  76, 39, 244, 186, 55, 139, 39, 211, 214, 136, 138, 220, 237, 100, 66, 88, 48, 203, 41, 115, 240, 8, 196, 110, 100,
  196, 225, 202, 97, 33, 6, 227, 25, 233, 8, 182, 124, 132, 63, 100, 188, 47, 120, 21, 210, 14, 4,
])

test("decrypts the Bitwarden attachment AES-CBC-HMAC binary vector", async () => {
  const encryptedCopy = new Uint8Array(encrypted)
  const keyCopy = new Uint8Array(key)
  const result = await bitwardenAttachmentBinaryDecrypt(encrypted, key)

  expect(result).toEqual({ success: true, data: plaintext })
  expect(encrypted).toEqual(encryptedCopy)
  expect(key).toEqual(keyCopy)
})

test("rejects invalid attachment type, layout, and key lengths", async () => {
  const wrongType = new Uint8Array(encrypted)
  wrongType[0] = 1
  expect((await bitwardenAttachmentBinaryDecrypt(wrongType, key)).success).toBe(false)

  expect((await bitwardenAttachmentBinaryDecrypt(new Uint8Array(48), key)).success).toBe(false)
  expect((await bitwardenAttachmentBinaryDecrypt(Uint8Array.from([2, ...new Uint8Array(48)]), key)).success).toBe(false)
  expect((await bitwardenAttachmentBinaryDecrypt(encrypted, new Uint8Array(63))).success).toBe(false)
})

test("rejects tampered attachment bytes before returning plaintext", async () => {
  const tamperedMac = new Uint8Array(encrypted)
  tamperedMac[17] ^= 1
  const tamperedCiphertext = new Uint8Array(encrypted)
  tamperedCiphertext[49] ^= 1
  const wrongKey = new Uint8Array(key)
  wrongKey[0] ^= 1

  expect((await bitwardenAttachmentBinaryDecrypt(tamperedMac, key)).success).toBe(false)
  expect((await bitwardenAttachmentBinaryDecrypt(tamperedCiphertext, key)).success).toBe(false)
  expect((await bitwardenAttachmentBinaryDecrypt(encrypted, wrongKey)).success).toBe(false)
})
