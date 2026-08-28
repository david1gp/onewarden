import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { base64Encode } from "./base64Encode.js"

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

export function base64Decode(value: string): Result<Uint8Array> {
  const op = "base64Decode"
  if (!BASE64_PATTERN.test(value)) return resultErrorCreate(op, "Invalid Base64 input.")

  try {
    const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
    if (base64Encode(bytes) !== value) return resultErrorCreate(op, "Invalid Base64 input.")
    return resultCreate(bytes)
  } catch {
    return resultErrorCreate(op, "Invalid Base64 input.")
  }
}
