import { expect, test } from "bun:test"
import { bitwardenAttachmentBinaryDecrypt } from "../../../../src/shared/crypto/bitwardenAttachmentBinaryDecrypt.js"
import { bitwardenAttachmentBinaryEncrypt } from "../../../../src/shared/crypto/bitwardenAttachmentBinaryEncrypt.js"

test("bitwardenAttachmentBinaryEncrypt round trips authenticated attachment bytes", async () => {
  const key = crypto.getRandomValues(new Uint8Array(64))
  const plaintext = new TextEncoder().encode("private attachment contents")
  const encrypted = await bitwardenAttachmentBinaryEncrypt(plaintext, key)

  expect(encrypted.success).toBe(true)
  if (!encrypted.success) return
  expect(encrypted.data[0]).toBe(2)
  expect(encrypted.data.byteLength).toBeGreaterThan(plaintext.byteLength)

  const decrypted = await bitwardenAttachmentBinaryDecrypt(encrypted.data, key)
  expect(decrypted.success).toBe(true)
  if (decrypted.success) expect(new TextDecoder().decode(decrypted.data)).toBe("private attachment contents")
})

test("bitwardenAttachmentBinaryEncrypt rejects invalid attachment keys", async () => {
  const result = await bitwardenAttachmentBinaryEncrypt(new Uint8Array([1]), new Uint8Array(32))
  expect(result).toMatchObject({ success: false, code: "platform.invalid-request", statusCode: 400 })
})
