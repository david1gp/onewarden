import type { Result } from "#result"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { sha256Digest } from "../../../shared/crypto/sha256Digest.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

/** Derives the RFC 7636 S256 code challenge for a PKCE code verifier. */
export async function webSsoCodeChallengeCreate(codeVerifier: string): Promise<Result<string>> {
  const digestResult = await sha256Digest(codeVerifier)
  if (!digestResult.success) return digestResult
  return resultCreate(base64UrlEncode(digestResult.data))
}
