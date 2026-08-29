import type { ExtensionLogin } from "./ExtensionLogin.js"

/** True when a login matches a free-text query by its standard searchable fields. */
export function extensionLoginSearchMatch(login: ExtensionLogin, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === "") return true
  if (login.name.toLowerCase().includes(needle)) return true
  if (login.username?.toLowerCase().includes(needle)) return true
  if (login.uri?.toLowerCase().includes(needle)) return true
  return false
}
