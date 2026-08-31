const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function base32Encode(bytes: Uint8Array): string {
  let output = ""
  let buffer = 0
  let bits = 0
  for (const byte of bytes) {
    buffer = buffer * 256 + byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      output += base32Alphabet[Math.floor(buffer / 2 ** bits) % 32]
      buffer %= 2 ** bits
    }
  }
  if (bits > 0) output += base32Alphabet[(buffer * 2 ** (5 - bits)) % 32]
  return output
}
