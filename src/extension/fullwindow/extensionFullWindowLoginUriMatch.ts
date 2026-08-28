import type { ExtensionFullWindowLogin } from "./ExtensionFullWindowLogin.js"

/** True when a login URI belongs to the given hostname or one of its subdomains. */
export function extensionFullWindowLoginUriMatch(login: ExtensionFullWindowLogin, hostname: string | null): boolean {
  if (!hostname) return true
  if (!login.uri) return false
  const needle = hostname.toLowerCase()
  const loginHostname = hostnameParse(login.uri)
  if (!loginHostname) return false
  if (loginHostname === needle) return true
  return loginHostname.endsWith(`.${needle}`)
}

function hostnameParse(uri: string): string | null {
  try {
    return new URL(uri).hostname.toLowerCase()
  } catch {
    return null
  }
}
