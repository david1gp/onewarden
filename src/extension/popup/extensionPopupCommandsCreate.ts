import type { Result } from "#result"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import { extensionClipboardAdapterCreate } from "../clipboard/extensionClipboardAdapterCreate.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
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

  let copyTimeoutId: ReturnType<typeof setTimeout> | null = null

  const loginFill = (login: ExtensionPopupLogin) => {
    void sender({ type: "loginFill", request: { loginId: login.id } }).then((res) => {
      if (!res.success && res.errorMessage) {
        onModelUpdate((prev) => ({ ...prev, errorMessage: res.errorMessage ?? "Fill failed." }))
      }
    })
  }

  const fieldCopy = (_login: ExtensionPopupLogin, field: ExtensionPopupCopyableField) => {
    void clipboard.copyText(field.value).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, copiedFieldKey: field.key }))
      if (copyTimeoutId !== null) clearTimeout(copyTimeoutId)
      copyTimeoutId = setTimeout(() => {
        onModelUpdate((prev) => (prev.copiedFieldKey === field.key ? { ...prev, copiedFieldKey: null } : prev))
      }, 2000)
    })
  }

  const loginAdd = () => {
    void sender({ type: "fullWindowOpen" })
  }

  const vaultSync = () => {
    onModelUpdate((prev) => ({ ...prev, busy: true }))
    void sender({ type: "manualSync" }).then(async () => {
      await onRefresh()
    })
  }

  const vaultLock = () => {
    onModelUpdate((prev) => ({ ...prev, busy: true }))
    void sender({ type: "lock" }).then(async () => {
      await onRefresh()
    })
  }

  const vaultLogout = () => {
    onModelUpdate((prev) => ({ ...prev, busy: true }))
    void sender({ type: "logout" }).then(async () => {
      await onRefresh()
    })
  }

  const fullVaultOpen = () => {
    void sender({ type: "fullWindowOpen" })
  }

  const vaultUnlock = (masterPassword: string) => {
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void sender({ type: "unlock", request: { password: masterPassword } }).then(async (res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: res.errorMessage ?? "Unlock failed." }))
        return
      }
      await onRefresh()
    })
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
    loginFill,
    fieldCopy,
    loginAdd,
    vaultSync,
    vaultLock,
    vaultLogout,
    fullVaultOpen,
    vaultUnlock,
    accountLogin,
    ...overrides,
  }
}
