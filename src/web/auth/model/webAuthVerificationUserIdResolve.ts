import * as v from "valibot"
import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"
import { webAuthTokenClaimsSchema } from "./webAuthTokenClaimsSchema.js"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Reads the user id from an email-verification JWT for form convenience; the server remains authoritative. */
export function webAuthVerificationUserIdResolve(token: string): string | null {
  const payload = token.split(".")[1]
  if (payload === undefined) return null
  const decoded = base64UrlDecode(payload)
  if (!decoded.success) return null
  let input: unknown
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decoded.data))
  } catch {
    return null
  }
  const parsed = v.safeParse(webAuthTokenClaimsSchema, input)
  if (!parsed.success || parsed.output.sub === undefined) return null
  return uuidPattern.test(parsed.output.sub) ? parsed.output.sub : null
}
