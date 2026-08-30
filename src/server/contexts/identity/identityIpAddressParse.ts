type IdentityParsedIpAddress = {
  address: string
  bytes: Uint8Array
  version: 4 | 6
}

export function identityIpAddressParse(value: string): IdentityParsedIpAddress | undefined {
  const ipv4 = identityIpv4AddressParse(value)
  if (ipv4 !== undefined) return ipv4
  return identityIpv6AddressParse(value)
}

function identityIpv4AddressParse(value: string): IdentityParsedIpAddress | undefined {
  if (!/^\d+(?:\.\d+){3}$/u.test(value)) return undefined
  const parts = value.split(".")
  const bytes = parts.map(Number)
  if (bytes.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return undefined
  return { address: bytes.join("."), bytes: Uint8Array.from(bytes), version: 4 }
}

function identityIpv6AddressParse(value: string): IdentityParsedIpAddress | undefined {
  let normalizedValue = value
  if (value.includes(".")) {
    const separator = value.lastIndexOf(":")
    if (separator === -1) return undefined
    const ipv4 = identityIpv4AddressParse(value.slice(separator + 1))
    if (ipv4 === undefined) return undefined
    const first = ipv4.bytes[0] ?? 0
    const second = ipv4.bytes[1] ?? 0
    const third = ipv4.bytes[2] ?? 0
    const fourth = ipv4.bytes[3] ?? 0
    normalizedValue = `${value.slice(0, separator + 1)}${first.toString(16).padStart(2, "0")}${second.toString(16).padStart(2, "0")}:${third
      .toString(16)
      .padStart(2, "0")}${fourth.toString(16).padStart(2, "0")}`
  }

  const compression = normalizedValue.indexOf("::")
  if (compression !== -1 && normalizedValue.indexOf("::", compression + 2) !== -1) return undefined
  const left = compression === -1 ? normalizedValue : normalizedValue.slice(0, compression)
  const right = compression === -1 ? "" : normalizedValue.slice(compression + 2)
  const leftParts = identityIpv6HextetsParse(left)
  const rightParts = identityIpv6HextetsParse(right)
  if (leftParts === undefined || rightParts === undefined) return undefined
  if (compression === -1 && leftParts.length !== 8) return undefined
  if (compression !== -1 && leftParts.length + rightParts.length >= 8) return undefined

  const hextets =
    compression === -1
      ? leftParts
      : [...leftParts, ...new Array<number>(8 - leftParts.length - rightParts.length).fill(0), ...rightParts]
  const bytes = new Uint8Array(16)
  for (const [index, hextet] of hextets.entries()) {
    bytes[index * 2] = hextet >> 8
    bytes[index * 2 + 1] = hextet & 0xff
  }
  return { address: identityIpv6AddressFormat(bytes), bytes, version: 6 }
}

function identityIpv6HextetsParse(value: string): number[] | undefined {
  if (value === "") return []
  const parts = value.split(":")
  if (parts.some((part) => !/^[0-9a-f]{1,4}$/iu.test(part))) return undefined
  return parts.map((part) => Number.parseInt(part, 16))
}

function identityIpv6AddressFormat(bytes: Uint8Array): string {
  const hextets = Array.from({ length: 8 }, (_, index) => ((bytes[index * 2] ?? 0) << 8) | (bytes[index * 2 + 1] ?? 0))
  let bestStart = -1
  let bestLength = 1
  for (let index = 0; index < hextets.length; ) {
    if (hextets[index] !== 0) {
      index += 1
      continue
    }
    const start = index
    while (index < hextets.length && hextets[index] === 0) index += 1
    if (index - start > bestLength) {
      bestStart = start
      bestLength = index - start
    }
  }
  if (bestStart === -1) return hextets.map((hextet) => hextet.toString(16)).join(":")
  const end = bestStart + bestLength
  const left = hextets
    .slice(0, bestStart)
    .map((hextet) => hextet.toString(16))
    .join(":")
  const right = hextets
    .slice(end)
    .map((hextet) => hextet.toString(16))
    .join(":")
  if (left === "" && right === "") return "::"
  if (left === "") return `::${right}`
  if (right === "") return `${left}::`
  return `${left}::${right}`
}
