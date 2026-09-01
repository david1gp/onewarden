import * as v from "valibot"
import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"
import { webAuthTokenClaimsSchema } from "./webAuthTokenClaimsSchema.js"

/** Resolves and normalizes the email claim from an access token payload. */
export function webAuthTokenEmailResolve(token: string): string | null {
  const parts = token.split(".")
  if (parts.length < 2 || parts[1] === undefined) return null
  const decoded = base64UrlDecode(parts[1])
  if (!decoded.success) return null
  let input: unknown
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decoded.data))
  } catch {
    return null
  }
  const parsed = v.safeParse(webAuthTokenClaimsSchema, input)
  if (!parsed.success || parsed.output.email === undefined) return null
  const email = parsed.output.email.trim().toLowerCase()
  return email.length > 0 ? email : null
}
