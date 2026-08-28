import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"

/** True when a decrypted personal login is applicable to an HTTP(S) active tab. */
export function extensionPersonalLoginSiteMatch(
  cipher: ExtensionPersonalLoginCipher,
  activeUrl: string | null,
): boolean {
  const active = activeUrlParse(activeUrl)
  if (active === null) return false

  const uris = cipher.login.uris.length > 0 ? cipher.login.uris : [{ uri: cipher.login.uri ?? null, match: null }]
  return uris.some((loginUri) => loginUriMatch(loginUri.uri, loginUri.match ?? null, active))
}

type ActiveUrl = {
  href: string
  hostname: string
}

function activeUrlParse(activeUrl: string | null): ActiveUrl | null {
  if (activeUrl === null) return null
  try {
    const parsed = new URL(activeUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return { href: parsed.href, hostname: parsed.hostname.toLowerCase().replace(/\.$/, "") }
  } catch {
    return null
  }
}

function loginUriMatch(uri: string | null, match: number | null, active: ActiveUrl): boolean {
  if (uri === null || uri === "") return false
  if (match === 5) return false
  if (match === 4) return regexMatch(uri, active.href)
  if (match === 2) return active.href.startsWith(uri)
  if (match === 3) return uriNormalize(uri) === uriNormalize(active.href)

  const loginHostname = loginHostnameParse(uri)
  if (loginHostname === null) return false
  if (match === 1) return loginHostname === active.hostname
  return loginHostname === active.hostname || active.hostname.endsWith(`.${loginHostname}`)
}

function loginHostnameParse(uri: string): string | null {
  try {
    return new URL(uri).hostname.toLowerCase().replace(/\.$/, "")
  } catch {
    return null
  }
}

function uriNormalize(uri: string): string {
  return uri.replace(/\/$/, "")
}

function regexMatch(pattern: string, value: string): boolean {
  try {
    return new RegExp(pattern).test(value)
  } catch {
    return false
  }
}
