import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

const AES_KEY_LENGTH = 32
const AES_IV_LENGTH = 16

export async function aesCbcDecrypt(
  ciphertext: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array,
): Promise<Result<Uint8Array>> {
  const op = "aesCbcDecrypt"
  if (key.byteLength !== AES_KEY_LENGTH) return resultErrorCreate(op, "AES-256 key is required.")
  if (iv.byteLength !== AES_IV_LENGTH) return resultErrorCreate(op, "AES-CBC IV must be 16 bytes.")
  if (ciphertext.byteLength === 0 || ciphertext.byteLength % AES_IV_LENGTH !== 0) {
    return resultErrorCreate(op, "AES-CBC ciphertext has an invalid length.")
  }

  try {
    const cryptoKey = await crypto.subtle.importKey("raw", new Uint8Array(key), { name: "AES-CBC" }, false, ["decrypt"])
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: new Uint8Array(iv) },
      cryptoKey,
      new Uint8Array(ciphertext),
    )
    return resultCreate(new Uint8Array(plaintext))
  } catch {
    return resultErrorCreate(op, "AES-CBC decryption failed.")
  }
}
