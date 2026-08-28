import type { ExtensionPopupLogin } from "./ExtensionPopupLogin.js"
import type { ExtensionPopupStatus } from "./ExtensionPopupStatus.js"

/**
 * Read model the popup renders. Background messaging fills this in a later task;
 * the view never reads chrome APIs itself.
 */
export interface ExtensionPopupViewModel {
  status: ExtensionPopupStatus
  /** Hostname of the active tab, or null when no site is in scope. */
  hostname: string | null
  /** Logins matching the active site, already ordered by relevance. */
  logins: ExtensionPopupLogin[]
  /** Message shown in the error state, and for recoverable failures elsewhere. */
  errorMessage: string | null
  /** True while a command triggered from the popup is still running. */
  busy: boolean
  /** Last successfully copied field key, used for transient copy feedback. */
  copiedFieldKey: string | null
  /** Whether the current build can fill the active tab. */
  fillAvailable: boolean
}
