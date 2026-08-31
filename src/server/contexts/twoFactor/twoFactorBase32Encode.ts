import { base32Encode } from "../../../shared/crypto/base32Encode.js"

export function twoFactorBase32Encode(bytes: Uint8Array): string {
  return base32Encode(bytes)
}
