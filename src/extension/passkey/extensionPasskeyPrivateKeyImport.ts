import { type Result } from "#result"
import { base64UrlDecode } from "../../shared/crypto/base64UrlDecode.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

export async function extensionPasskeyPrivateKeyImport(keyValue: string): Promise<Result<CryptoKey>> {
  const op = "extensionPasskeyPrivateKeyImport"
  const keyResult = base64UrlDecode(keyValue)
  if (!keyResult.success || keyResult.data.byteLength === 0)
    return resultErrorCreate(op, "Stored WebAuthn private key is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  try {
    const key = await crypto.subtle.importKey(
      "pkcs8",
      new Uint8Array(keyResult.data) as Uint8Array<ArrayBuffer>,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    )
    return resultCreate(key)
  } catch {
    return resultErrorCreate(op, "Stored WebAuthn private key is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
}
