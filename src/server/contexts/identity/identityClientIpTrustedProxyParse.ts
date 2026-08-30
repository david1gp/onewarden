import { identityIpAddressParse } from "./identityIpAddressParse.js"

export function identityClientIpTrustedProxyParse(value: string) {
  const entry = value.trim()
  const separator = entry.indexOf("/")
  if (separator !== -1 && entry.indexOf("/", separator + 1) !== -1) return undefined
  const address = identityIpAddressParse(separator === -1 ? entry : entry.slice(0, separator))
  if (address === undefined) return undefined
  const prefixLength =
    separator === -1 ? (address.version === 4 ? 32 : 128) : identityIpPrefixLengthParse(entry.slice(separator + 1))
  if (prefixLength === undefined || prefixLength > (address.version === 4 ? 32 : 128)) return undefined
  return { ...address, prefixLength }
}

function identityIpPrefixLengthParse(value: string): number | undefined {
  if (!/^\d+$/u.test(value)) return undefined
  const prefixLength = Number(value)
  return Number.isSafeInteger(prefixLength) ? prefixLength : undefined
}
