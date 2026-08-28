import type { ExtensionFullWindowLogin } from "./ExtensionFullWindowLogin.js"

/** True when a login matches a free-text full-window search query, including custom field labels. */
export function extensionFullWindowLoginSearchMatch(login: ExtensionFullWindowLogin, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === "") return true
  if (login.name.toLowerCase().includes(needle)) return true
  if (login.username?.toLowerCase().includes(needle)) return true
  if (login.uri?.toLowerCase().includes(needle)) return true
  return login.copyableFields.some((field) => field.label.toLowerCase().includes(needle))
}
