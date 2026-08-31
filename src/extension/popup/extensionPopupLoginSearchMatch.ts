import type { ExtensionLogin } from "../ExtensionLogin.js"
import { extensionLoginSearchMatch } from "../extensionLoginSearchMatch.js"

/** True when a login matches a free-text popup search query. */
export function extensionPopupLoginSearchMatch(login: ExtensionLogin, query: string): boolean {
  return extensionLoginSearchMatch(login, query)
}
