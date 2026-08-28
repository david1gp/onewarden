import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { base64Decode } from "./base64Decode.js"

const BASE64_URL_UNPADDED_PATTERN = /^[A-Za-z0-9_-]*$/

export function base64UrlDecode(value: string): Result<Uint8Array> {
  const op = "base64UrlDecode"
  if (!BASE64_URL_UNPADDED_PATTERN.test(value) || value.length % 4 === 1) {
    return resultErrorCreate(op, "Invalid Base64URL input.")
  }

  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  const padding = (4 - (normalized.length % 4)) % 4
  const decoded = base64Decode(`${normalized}${"=".repeat(padding)}`)
  if (!decoded.success) return resultErrorCreate(op, "Invalid Base64URL input.")
  return resultCreate(decoded.data)
}
