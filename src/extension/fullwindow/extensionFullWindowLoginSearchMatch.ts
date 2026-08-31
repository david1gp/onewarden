import type { ExtensionLogin } from "../ExtensionLogin.js"
import { extensionLoginSearchMatch } from "../extensionLoginSearchMatch.js"

/** True when a login matches a free-text full-window search query, including custom field labels. */
export function extensionFullWindowLoginSearchMatch(login: ExtensionLogin, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (extensionLoginSearchMatch(login, query)) return true
  return login.copyableFields.some((field) => field.label.toLowerCase().includes(needle))
}
