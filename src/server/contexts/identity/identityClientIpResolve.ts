import type { Context } from "hono"
import type { IdentityClientIpConfiguration } from "./identityClientIpConfiguration.js"
import { identityClientIpTrustedProxyParse } from "./identityClientIpTrustedProxyParse.js"
import { identityIpAddressParse } from "./identityIpAddressParse.js"

const identityClientIpDefaultConfiguration: IdentityClientIpConfiguration = {
  header: "X-Real-IP",
  trustedProxies: "local",
}
const identityClientIpFallback = "0.0.0.0"

type IdentityParsedIpAddress = NonNullable<ReturnType<typeof identityIpAddressParse>>
type IdentityTrustedProxy = NonNullable<ReturnType<typeof identityClientIpTrustedProxyParse>>

export function identityClientIpResolve(
  context: Context,
  configuration: IdentityClientIpConfiguration = identityClientIpDefaultConfiguration,
): string {
  const remote = identityClientIpRemoteResolve(context)
  const header = configuration.header.trim()
  if (header.length === 0 || header.toLowerCase() === "none") return remote?.address ?? identityClientIpFallback
  if (!identityClientIpTrusted(remote, configuration.trustedProxies)) return remote?.address ?? identityClientIpFallback
  const headerValue = context.req.header(header)
  if (headerValue === undefined) return remote?.address ?? identityClientIpFallback
  const headerAddress = identityIpAddressParse(headerValue.split(",", 1)[0] ?? "")
  return headerAddress?.address ?? remote?.address ?? identityClientIpFallback
}

function identityClientIpRemoteResolve(context: Context): IdentityParsedIpAddress | undefined {
  const remoteIpAddress = context.env?.remoteIpAddress
  if (typeof remoteIpAddress !== "string") return undefined
  const parsed = identityIpAddressParse(remoteIpAddress)
  if (parsed === undefined) return undefined
  if (!identityIpAddressIsMappedIpv6(parsed)) return parsed
  const bytes = parsed.bytes.slice(12)
  return { address: Array.from(bytes).join("."), bytes, version: 4 }
}

function identityClientIpTrusted(remote: IdentityParsedIpAddress | undefined, trustedProxies: string): boolean {
  const trusted = trustedProxies.trim()
  if (trusted.toLowerCase() === "all") return true
  if (remote === undefined) return false
  if (trusted.toLowerCase() === "local") return !identityIpAddressIsGlobal(remote)
  return trusted
    .split(",")
    .filter((entry) => entry.trim().length > 0)
    .map(identityClientIpTrustedProxyParse)
    .some((proxy): proxy is IdentityTrustedProxy => proxy !== undefined && identityIpNetworkContains(proxy, remote))
}

function identityIpNetworkContains(network: IdentityTrustedProxy, address: IdentityParsedIpAddress): boolean {
  if (network.version !== address.version) return false
  const fullBytes = Math.floor(network.prefixLength / 8)
  for (let index = 0; index < fullBytes; index += 1) {
    if (network.bytes[index] !== address.bytes[index]) return false
  }
  const remainingBits = network.prefixLength % 8
  if (remainingBits === 0) return true
  const mask = 0xff << (8 - remainingBits)
  return ((network.bytes[fullBytes] ?? 0) & mask) === ((address.bytes[fullBytes] ?? 0) & mask)
}

function identityIpAddressIsMappedIpv6(address: IdentityParsedIpAddress): boolean {
  if (address.version !== 6) return false
  for (let index = 0; index < 10; index += 1) {
    if (address.bytes[index] !== 0) return false
  }
  return address.bytes[10] === 0xff && address.bytes[11] === 0xff
}

function identityIpAddressIsGlobal(address: IdentityParsedIpAddress): boolean {
  if (address.version === 4) return identityIpv4AddressIsGlobal(address.bytes)
  return identityIpv6AddressIsGlobal(address.bytes)
}

function identityIpv4AddressIsGlobal(bytes: Uint8Array): boolean {
  const first = bytes[0] ?? 0
  const second = bytes[1] ?? 0
  const third = bytes[2] ?? 0
  const fourth = bytes[3] ?? 0
  if (
    first === 0 ||
    first === 10 ||
    (first === 100 && second >= 64 && second <= 127) ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && third === 0 && fourth !== 9 && fourth !== 10) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && second >= 18 && second <= 19) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    (first >= 240 && !(first === 255 && second === 255 && third === 255 && fourth === 255)) ||
    (first === 255 && second === 255 && third === 255 && fourth === 255)
  )
    return false
  return true
}

function identityIpv6AddressIsGlobal(bytes: Uint8Array): boolean {
  if (bytes.every((byte) => byte === 0) || (bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1))
    return false
  if (
    identityIpPrefixMatches(
      bytes,
      [0x64, 0xff, 0x9b, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      48,
    ) ||
    identityIpPrefixMatches(
      bytes,
      [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      64,
    ) ||
    identityIpPrefixMatches(
      bytes,
      [0xfc, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      7,
    ) ||
    identityIpPrefixMatches(
      bytes,
      [0xfe, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      10,
    ) ||
    identityIpPrefixMatches(
      bytes,
      [0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      32,
    ) ||
    (identityIpPrefixMatches(
      bytes,
      [0x3f, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      16,
    ) &&
      identityIpv6SecondHextet(bytes) <= 0x0fff) ||
    identityIpPrefixMatches(
      bytes,
      [0x5f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      16,
    ) ||
    identityIpPrefixMatches(
      bytes,
      [0x20, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      16,
    )
  )
    return false
  if (
    identityIpPrefixMatches(
      bytes,
      [0x20, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      23,
    )
  ) {
    const isAllowedAssignment =
      identityIpBytesEqual(
        bytes,
        [0x20, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01],
      ) ||
      identityIpBytesEqual(
        bytes,
        [0x20, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02],
      ) ||
      identityIpPrefixMatches(
        bytes,
        [0x20, 0x01, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        32,
      ) ||
      identityIpPrefixMatches(
        bytes,
        [0x20, 0x01, 0x00, 0x04, 0x01, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        48,
      ) ||
      identityIpPrefixMatches(
        bytes,
        [0x20, 0x01, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        28,
      ) ||
      identityIpPrefixMatches(
        bytes,
        [0x20, 0x01, 0x00, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        28,
      )
    if (!isAllowedAssignment) return false
  }
  return true
}

function identityIpv6SecondHextet(bytes: Uint8Array): number {
  return ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0)
}

function identityIpPrefixMatches(bytes: Uint8Array, prefix: number[], prefixLength: number): boolean {
  const fullBytes = Math.floor(prefixLength / 8)
  for (let index = 0; index < fullBytes; index += 1) {
    if (bytes[index] !== prefix[index]) return false
  }
  const remainingBits = prefixLength % 8
  if (remainingBits === 0) return true
  const mask = 0xff << (8 - remainingBits)
  return ((bytes[fullBytes] ?? 0) & mask) === ((prefix[fullBytes] ?? 0) & mask)
}

function identityIpBytesEqual(bytes: Uint8Array, expected: number[]): boolean {
  return bytes.length === expected.length && bytes.every((byte, index) => byte === expected[index])
}
