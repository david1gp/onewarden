import { isIP } from "node:net"
import type { IconConfig } from "./iconConfigSchema.js"

export function iconHostBlocked(host: string, config: IconConfig): boolean {
  if (config.HTTP_REQUEST_BLOCK_REGEX !== undefined) {
    try {
      if (new RegExp(config.HTTP_REQUEST_BLOCK_REGEX).test(host)) return true
    } catch {
      return true
    }
  }
  if (!config.HTTP_REQUEST_BLOCK_NON_GLOBAL_IPS || isIP(host) === 0) return false
  if (isIP(host) === 4) return iconIpv4Blocked(host)
  const groups = iconIpv6Groups(host.toLowerCase())
  if (groups === undefined) return true
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    const first = groups[6] ?? 0
    const second = groups[7] ?? 0
    return iconIpv4Blocked(`${Math.floor(first / 256)}.${first % 256}.${Math.floor(second / 256)}.${second % 256}`)
  }
  const first = groups[0] ?? 0
  const second = groups[1] ?? 0
  return (
    groups.every((group) => group === 0) ||
    (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1) ||
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first === 0x2001 && second === 0x0db8) ||
    (first & 0xff00) === 0xff00
  )
}

function iconIpv4Blocked(value: string): boolean {
  const octets = value.split(".").map(Number)
  const first = octets[0] ?? -1
  const second = octets[1] ?? -1
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51) ||
    (first === 203 && second === 0 && octets[2] === 113) ||
    first >= 224
  )
}

function iconIpv6Groups(value: string): number[] | undefined {
  const dotted = value.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/iu)
  let normalized = value
  if (dotted !== null && dotted[1] !== undefined && dotted[2] !== undefined) {
    const octets = dotted[2].split(".").map(Number)
    if (octets.length !== 4 || octets.some((octet) => octet < 0 || octet > 255)) return undefined
    normalized = `${dotted[1]}${((octets[0] ?? 0) * 256 + (octets[1] ?? 0)).toString(16)}:${((octets[2] ?? 0) * 256 + (octets[3] ?? 0)).toString(16)}`
  }

  const pieces = normalized.split("::")
  if (pieces.length > 2) return undefined
  const left = pieces[0] === "" ? [] : (pieces[0]?.split(":").map((group) => Number.parseInt(group, 16)) ?? [])
  const right =
    pieces.length === 2 && pieces[1] !== ""
      ? (pieces[1]?.split(":").map((group) => Number.parseInt(group, 16)) ?? [])
      : []
  if ([...left, ...right].some((group) => Number.isNaN(group) || group < 0 || group > 0xffff)) return undefined
  const missing = 8 - left.length - right.length
  if ((pieces.length === 1 && missing !== 0) || (pieces.length === 2 && missing < 1)) return undefined
  return [...left, ...Array.from({ length: missing }, () => 0), ...right]
}
