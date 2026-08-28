import type { ExtensionCreateLoginRequest } from "../create/extensionCreateLoginRequestSchema.js"
import type { ExtensionFullWindowCopyableField } from "./ExtensionFullWindowCopyableField.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"
import type { ExtensionFullWindowLogin } from "./ExtensionFullWindowLogin.js"

/** Every side effect the full-window vault may request; the background owns the implementations. */
export interface ExtensionFullWindowCommands {
  loginFill: (login: ExtensionFullWindowLogin) => void
  fieldCopy: (login: ExtensionFullWindowLogin, field: ExtensionFullWindowCopyableField) => void
  loginAdd: () => void
  /** Create one personal login entry from the full-window editor. */
  loginCreate: (request: ExtensionCreateLoginRequest) => void
  /** Persist the in-progress create form as an encrypted draft. */
  loginDraftSave: (request: ExtensionCreateLoginRequest) => void
  /** Drop the encrypted draft of an abandoned create form. */
  loginDraftDiscard: (draftId: string) => void
  vaultSync: () => void
  vaultLock: () => void
  vaultLogout: () => void
  vaultUnlock: (masterPassword: string) => void
  accountLogin: (
    credentials?: { email: string; password: string },
    environment?: ExtensionFullWindowEnvironmentSettings,
  ) => void
  environmentSave: (environment: ExtensionFullWindowEnvironmentSettings) => void
}
