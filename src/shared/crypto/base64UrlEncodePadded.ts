import { base64Encode } from "./base64Encode.js"

export function base64UrlEncodePadded(bytes: Uint8Array): string {
  return base64Encode(bytes).replaceAll("+", "-").replaceAll("/", "_")
}
