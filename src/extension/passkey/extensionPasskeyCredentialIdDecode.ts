import { type Result } from "#result"
import { base64UrlDecode } from "../../shared/crypto/base64UrlDecode.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export function extensionPasskeyCredentialIdDecode(value: string): Result<Uint8Array> {
  const op = "extensionPasskeyCredentialIdDecode"
  if (value.startsWith("b64.")) {
    const decodedResult = base64UrlDecode(value.slice(4))
    if (!decodedResult.success || decodedResult.data.byteLength === 0)
      return resultErrorCreate(op, "WebAuthn credential ID is invalid.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    return decodedResult
  }
  if (uuidPattern.test(value)) {
    const hexadecimal = value.replaceAll("-", "")
    return resultCreate(
      Uint8Array.from({ length: 16 }, (_, index) => Number.parseInt(hexadecimal.slice(index * 2, index * 2 + 2), 16)),
    )
  }
  const rawResult = base64UrlDecode(value)
  if (!rawResult.success || rawResult.data.byteLength === 0)
    return resultErrorCreate(op, "WebAuthn credential ID is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  return rawResult
}
