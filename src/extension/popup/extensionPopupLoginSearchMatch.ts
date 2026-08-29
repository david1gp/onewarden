import type { ExtensionPopupLogin } from "./ExtensionPopupLogin.js"
import { extensionLoginSearchMatch } from "../extensionLoginSearchMatch.js"

/** True when a login matches a free-text popup search query. */
export function extensionPopupLoginSearchMatch(login: ExtensionPopupLogin, query: string): boolean {
  return extensionLoginSearchMatch(login, query)
}
