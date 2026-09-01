import type { Result } from "#result"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import { sha256Digest } from "../../../shared/crypto/sha256Digest.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"

export async function identitySsoCodeVerifierValidate(
  codeVerifier: string,
  clientChallenge: string,
): Promise<Result<void>> {
  const op = "identitySsoCodeVerifierValidate"
  const digestResult = await sha256Digest(codeVerifier)
  if (!digestResult.success) return digestResult
  if (!constantTimeStringsEqual(base64UrlEncode(digestResult.data), clientChallenge))
    return identityDomainErrorCreate(op, "PKCE client challenge failed")
  return resultCreate(undefined)
}
