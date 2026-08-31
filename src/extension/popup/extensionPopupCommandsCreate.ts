import type { Result } from "#result"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import { extensionClipboardAdapterCreate } from "../clipboard/extensionClipboardAdapterCreate.js"
import { extensionCommonCommandsCreate } from "../commands/extensionCommonCommandsCreate.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import type { ExtensionPopupCommands } from "./ExtensionPopupCommands.js"
import type { ExtensionPopupCopyableField } from "./ExtensionPopupCopyableField.js"
import type { ExtensionPopupLogin } from "./ExtensionPopupLogin.js"
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

  const commonCommands = extensionCommonCommandsCreate<
    ExtensionPopupLogin,
    ExtensionPopupCopyableField,
    ExtensionPopupViewModel
  >({
    messageSend: sender,
    clipboard,
    onModelUpdate,
    onRefresh,
  })

  const loginAdd = () => {
    void sender({ type: "fullWindowOpen" })
  }

  const fullVaultOpen = () => {
    void sender({ type: "fullWindowOpen" })
  }

  const accountLogin = (credentials?: { email: string; password: string }) => {
    if (credentials !== undefined) {
      onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
      void sender({ type: "login", request: credentials }).then(async (res) => {
        if (!res.success) {
          onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: res.errorMessage ?? "Login failed." }))
          return
        }
        await onRefresh()
      })
      return
    }
    void sender({ type: "fullWindowOpen" })
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
    vaultUnlock: commonCommands.vaultUnlock,
    accountLogin,
    ...overrides,
  }
}
