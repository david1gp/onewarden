import { type Result } from "#result"
import { base64UrlDecode } from "../../shared/crypto/base64UrlDecode.js"
import { sha256Digest } from "../../shared/crypto/sha256Digest.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

export async function extensionPasskeyClientDataHashCreate(clientDataJSON: string): Promise<Result<Uint8Array>> {
  const op = "extensionPasskeyClientDataHashCreate"
  const clientDataResult = base64UrlDecode(clientDataJSON)
  if (!clientDataResult.success)
    return resultErrorCreate(op, "WebAuthn client data is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  if (clientDataResult.data.byteLength === 0)
    return resultErrorCreate(op, "WebAuthn client data is empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  const hashResult = await sha256Digest(clientDataResult.data)
  if (!hashResult.success) return hashResult
  return resultCreate(hashResult.data)
}
