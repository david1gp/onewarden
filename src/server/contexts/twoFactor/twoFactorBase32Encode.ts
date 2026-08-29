export function twoFactorBase32Encode(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let output = ""
  let buffer = 0
  let bits = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      output += alphabet[(buffer >> bits) & 31]
    }
  }
  if (bits > 0) output += alphabet[(buffer << (5 - bits)) & 31]
  return output
}
