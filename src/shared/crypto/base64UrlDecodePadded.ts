import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { base64Decode } from "./base64Decode.js"

const BASE64_URL_PADDED_PATTERN = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}==|[A-Za-z0-9_-]{3}=)?$/

export function base64UrlDecodePadded(value: string): Result<Uint8Array> {
  const op = "base64UrlDecodePadded"
  if (!BASE64_URL_PADDED_PATTERN.test(value)) return resultErrorCreate(op, "Invalid padded Base64URL input.")

  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  const decoded = base64Decode(normalized)
  if (!decoded.success) return resultErrorCreate(op, "Invalid padded Base64URL input.")
  return resultCreate(decoded.data)
}
