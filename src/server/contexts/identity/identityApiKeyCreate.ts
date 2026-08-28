import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"

const identityApiKeyAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
const identityApiKeyRandomLimit = 256 - (256 % identityApiKeyAlphabet.length)

export function identityApiKeyCreate(): Result<string> {
  const op = "identityApiKeyCreate"
  let value = ""
  while (value.length < 30) {
    const randomResult = secureRandomBytes(64)
    if (!randomResult.success) return resultErrorCreate(op, randomResult.errorMessage)
    for (const byte of randomResult.data) {
      if (byte >= identityApiKeyRandomLimit) continue
      const character = identityApiKeyAlphabet[byte % identityApiKeyAlphabet.length]
      if (character === undefined) continue
      value += character
      if (value.length === 30) break
    }
  }
  return resultCreate(value)
}
