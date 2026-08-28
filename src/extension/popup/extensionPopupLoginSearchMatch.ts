import type { ExtensionPopupLogin } from "./ExtensionPopupLogin.js"

/** True when a login matches a free-text popup search query. */
export function extensionPopupLoginSearchMatch(login: ExtensionPopupLogin, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === "") return true
  if (login.name.toLowerCase().includes(needle)) return true
  if (login.username?.toLowerCase().includes(needle)) return true
  if (login.uri?.toLowerCase().includes(needle)) return true
  return false
}
