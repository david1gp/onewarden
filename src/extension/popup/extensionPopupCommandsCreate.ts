import type { Result } from "#result"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import { extensionClipboardAdapterCreate } from "../clipboard/extensionClipboardAdapterCreate.js"
import { extensionCommonCommandsCreate } from "../commands/extensionCommonCommandsCreate.js"
import type { ExtensionCopyableField } from "../ExtensionCopyableField.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import type { ExtensionPopupCommands } from "./ExtensionPopupCommands.js"
import type { ExtensionPopupViewModel } from "./ExtensionPopupViewModel.js"

export type ExtensionPopupCommandsOptions = {
  messageSend?: (message: ExtensionRuntimeMessage) => Promise<Result<any>>
  clipboard?: ExtensionClipboardAdapter
  onModelUpdate?: (updater: (prev: ExtensionPopupViewModel) => ExtensionPopupViewModel) => void
  onRefresh?: () => Promise<void>
}

/**
 * Popup commands dispatch typed runtime messages to the background worker
 * and manage copy feedback, busy states, and view model refresh.
 */
export function extensionPopupCommandsCreate(
  overrides: Partial<ExtensionPopupCommands> = {},
  options: ExtensionPopupCommandsOptions = {},
): ExtensionPopupCommands {
  const sender = options.messageSend ?? extensionRuntimeMessageSend
  const clipboard = options.clipboard ?? extensionClipboardAdapterCreate()
  const onModelUpdate = options.onModelUpdate ?? (() => {})
  const onRefresh = options.onRefresh ?? (async () => {})

  const commonCommands = extensionCommonCommandsCreate<ExtensionLogin, ExtensionCopyableField, ExtensionPopupViewModel>(
    {
      messageSend: sender,
      clipboard,
      onModelUpdate,
      onRefresh,
    },
  )

  const loginAdd = () => {
    void sender({ type: "fullWindowOpen", pane: "vault" })
  }

  const fullVaultOpen = () => {
    void sender({ type: "fullWindowOpen", pane: "vault" })
  }

  const generatorOpen = () => {
    void sender({ type: "fullWindowOpen", pane: "generator" })
  }

  const settingsOpen = () => {
    void sender({ type: "fullWindowOpen", pane: "settings" })
  }

  const accountLogin = (credentials?: { email: string; password: string }) => {
    if (credentials !== undefined) {
      onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
      void sender({
        type: "login",
        request: {
          ...credentials,
          clientId: "browser",
          scope: "api offline_access",
          deviceIdentifier: "onewarden-extension",
          deviceName: "OneWarden",
          deviceType: "14",
        },
      }).then(async (res) => {
        if (!res.success) {
          onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: res.errorMessage ?? "Login failed." }))
          return
        }
        await onRefresh()
      })
      return
    }
    void sender({ type: "fullWindowOpen", pane: "vault" })
  }

  const accountRegister = () => {
    void sender({ type: "fullWindowOpen", pane: "auth" })
  }

  return {
    loginFill: commonCommands.loginFill,
    fieldCopy: commonCommands.fieldCopy,
    totpCopy: commonCommands.totpCopy,
    loginAdd,
    vaultSync: commonCommands.vaultSync,
    vaultLock: commonCommands.vaultLock,
    vaultLogout: commonCommands.vaultLogout,
    fullVaultOpen,
    generatorOpen,
    settingsOpen,
    vaultUnlock: commonCommands.vaultUnlock,
    biometricUnlock: commonCommands.biometricUnlock,
    accountLogin,
    accountRegister,
    ...overrides,
  }
}
