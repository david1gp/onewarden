import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Reads the user id from an email-verification JWT for form convenience; the server remains authoritative. */
export function webAuthVerificationUserIdResolve(token: string): string | null {
  const payload = token.split(".")[1]
  if (payload === undefined) return null
  const decoded = base64UrlDecode(payload)
  if (!decoded.success) return null
  try {
    const claims: unknown = JSON.parse(new TextDecoder().decode(decoded.data))
    if (typeof claims !== "object" || claims === null || typeof (claims as { sub?: unknown }).sub !== "string") {
      return null
    }
    const userId = (claims as { sub: string }).sub
    return uuidPattern.test(userId) ? userId : null
  } catch {
    return null
  }
}
