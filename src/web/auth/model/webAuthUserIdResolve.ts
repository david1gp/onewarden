import * as v from "valibot"
import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"
import { webAuthTokenClaimsSchema } from "./webAuthTokenClaimsSchema.js"

export function webAuthUserIdResolve(token: string): string {
  const parts = token.split(".")
  if (parts.length < 2 || parts[1] === undefined) return "anonymous"
  const decoded = base64UrlDecode(parts[1])
  if (!decoded.success) return "anonymous"
  try {
    const json: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decoded.data))
    const parsed = v.safeParse(webAuthTokenClaimsSchema, json)
    if (parsed.success && parsed.output.sub !== undefined) return parsed.output.sub
  } catch {
    return "anonymous"
  }
  return "anonymous"
}
