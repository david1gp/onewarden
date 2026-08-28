import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"

export function sendAccessIdCreate(uuid: string): string {
  const uuidBytes = sendUuidBytes(uuid)
  return base64UrlEncode(uuidBytes ?? new TextEncoder().encode(uuid))
}

function sendUuidBytes(value: string): Uint8Array | undefined {
  const normalized = value.replaceAll("-", "")
  if (!/^[0-9a-fA-F]{32}$/.test(normalized)) return undefined
  const bytes = new Uint8Array(16)
  for (let index = 0; index < bytes.length; index += 1) {
    const pair = normalized.slice(index * 2, index * 2 + 2)
    bytes[index] = Number.parseInt(pair, 16)
  }
  return bytes
}
