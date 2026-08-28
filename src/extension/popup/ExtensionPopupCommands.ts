import type { ExtensionPopupCopyableField } from "./ExtensionPopupCopyableField.js"
import type { ExtensionPopupLogin } from "./ExtensionPopupLogin.js"

/**
 * Everything the popup can ask the background service worker to do.
 * Injected into the view so background message wiring stays out of the UI.
 */
export interface ExtensionPopupCommands {
  /** Fill the selected login into the active tab; always user-initiated. */
  loginFill: (login: ExtensionPopupLogin) => void
  /** Copy one standard or custom field value to the clipboard. */
  fieldCopy: (login: ExtensionPopupLogin, field: ExtensionPopupCopyableField) => void
  /** Open the create-login flow in the full window. */
  loginAdd: () => void
  /** Trigger a vault synchronization. */
  vaultSync: () => void
  /** Lock the vault, keeping the account signed in. */
  vaultLock: () => void
  /** Sign out and clear stored credentials. */
  vaultLogout: () => void
  /** Open the full-window vault. */
  fullVaultOpen: () => void
  /** Unlock from the locked state using the master password. */
  vaultUnlock: (masterPassword: string) => void
  /** Start the login flow from the logged-out state or log in with credentials. */
  accountLogin: (credentials?: { email: string; password: string }) => void
}
