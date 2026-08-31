import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import type { ExtensionFullWindowCopyableField } from "./ExtensionFullWindowCopyableField.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"
import type { ExtensionFullWindowLogin } from "./ExtensionFullWindowLogin.js"

/** Every side effect the full-window vault may request; the background owns the implementations. */
export interface ExtensionFullWindowCommands {
  loginFill: (login: ExtensionFullWindowLogin) => void
  fieldCopy: (login: ExtensionFullWindowLogin, field: ExtensionFullWindowCopyableField) => void
  /** Generate and copy the current TOTP code without exposing its seed. */
  totpCopy: (login: ExtensionFullWindowLogin) => void
  /** Open the normal web create page through a secure session handoff. */
  loginAdd: () => void
  /** Open the normal web edit page through a secure session handoff. */
  loginEdit: (login: ExtensionFullWindowLogin) => void
  vaultSync: () => void
  vaultLock: () => void
  vaultLogout: () => void
  vaultUnlock: (masterPassword: string) => void
  accountLogin: (
    credentials?: { email: string; password: string },
    environment?: ExtensionFullWindowEnvironmentSettings,
  ) => void
  environmentSave: (environment: ExtensionFullWindowEnvironmentSettings) => void
  lockPolicySave: (policy: ExtensionLockPolicy) => void
}
