import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncStringDecrypt } from "./extensionEncStringDecrypt.js"

type CipherKeySource = {
  organizationId?: string | null
  key?: string | null
}

export async function extensionCipherKeyResolve(
  cipher: CipherKeySource,
  userKey: Uint8Array,
  organizationKeys: ReadonlyMap<string, Uint8Array> = new Map(),
): Promise<Result<Uint8Array>> {
  const op = "extensionCipherKeyResolve"
  const organizationId = cipher.organizationId ?? null
  const wrappingKey = organizationId === null ? userKey : organizationKeys.get(organizationId)
  if (wrappingKey === undefined) {
    return resultErrorCreate(op, "Organization key is unavailable.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }
  if (cipher.key === undefined || cipher.key === null) return resultCreate(wrappingKey)

  const cipherKeyResult = await extensionEncStringDecrypt(cipher.key, wrappingKey)
  if (!cipherKeyResult.success) return cipherKeyResult
  if (cipherKeyResult.data.byteLength !== 64) {
    cipherKeyResult.data.fill(0)
    return resultErrorCreate(op, "Decrypted cipher key is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  return resultCreate(cipherKeyResult.data)
}
