import type { ExtensionCopyableField } from "../ExtensionCopyableField.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"

/**
 * Everything the popup can ask the background service worker to do.
 * Injected into the view so background message wiring stays out of the UI.
 */
export interface ExtensionPopupCommands {
  /** Fill the selected login into the active tab; always user-initiated. */
  loginFill: (login: ExtensionLogin) => void
  /** Copy one standard or custom field value to the clipboard. */
  fieldCopy: (login: ExtensionLogin, field: ExtensionCopyableField) => void
  /** Generate and copy the current TOTP code without exposing its seed. */
  totpCopy: (login: ExtensionLogin) => void
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
  /** Open the full-window password generator. */
  generatorOpen: () => void
  /** Open the full-window settings. */
  settingsOpen: () => void
  /** Unlock from the locked state using the master password. */
  vaultUnlock: (masterPassword: string) => void
  /** Unlock from the locked state using biometrics. */
  biometricUnlock: () => void
  /** Start the login flow from the logged-out state or log in with credentials. */
  accountLogin: (credentials?: { email: string; password: string }) => void
  /** Open extension-native account creation and verification in the full window. */
  accountRegister: () => void
}
