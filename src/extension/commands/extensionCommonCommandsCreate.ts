import type { Result } from "#result"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"

type ExtensionCommonLogin = {
  id: string
}

type ExtensionCommonCopyableField = {
  key: string
  value: string
}

type ExtensionCommonViewModel = {
  busy: boolean
  copiedFieldKey: string | null
  errorMessage: string | null
}

type ExtensionCommonCommandsOptions<ViewModel extends ExtensionCommonViewModel> = {
  messageSend: (message: ExtensionRuntimeMessage) => Promise<Result<unknown>>
  clipboard: ExtensionClipboardAdapter
  onModelUpdate: (updater: (prev: ViewModel) => ViewModel) => void
  onRefresh: () => Promise<void>
}

type ExtensionCommonCommands<Login extends ExtensionCommonLogin, Field extends ExtensionCommonCopyableField> = {
  loginFill: (login: Login) => void
  fieldCopy: (login: Login, field: Field) => void
  totpCopy: (login: Login) => void
  vaultSync: () => void
  vaultLock: () => void
  vaultLogout: () => void
  vaultUnlock: (masterPassword: string) => void
}

/** Creates the commands shared by extension surfaces without owning their surface-specific commands. */
export function extensionCommonCommandsCreate<
  Login extends ExtensionCommonLogin,
  Field extends ExtensionCommonCopyableField,
  ViewModel extends ExtensionCommonViewModel,
>(options: ExtensionCommonCommandsOptions<ViewModel>): ExtensionCommonCommands<Login, Field> {
  const { messageSend, clipboard, onModelUpdate, onRefresh } = options

  let copyTimeoutId: ReturnType<typeof setTimeout> | null = null

  const loginFill = (login: Login) => {
    void messageSend({ type: "loginFill", request: { loginId: login.id } }).then((res) => {
      if (!res.success && res.errorMessage) {
        onModelUpdate((prev) => ({ ...prev, errorMessage: res.errorMessage ?? "Fill failed." }))
      }
    })
  }

  const fieldCopy = (_login: Login, field: Field) => {
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

  const totpCopy = (login: Login) => {
    void messageSend({ type: "totpCopy", request: { loginId: login.id } }).then(async (res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, errorMessage: res.errorMessage }))
        return
      }
      if (typeof res.data !== "string") {
        onModelUpdate((prev) => ({ ...prev, errorMessage: "TOTP code generation failed." }))
        return
      }
      const copyResult = await clipboard.copyText(res.data)
      if (!copyResult.success) {
        onModelUpdate((prev) => ({ ...prev, errorMessage: copyResult.errorMessage }))
        return
      }
      const copiedKey = `totp:${login.id}`
      onModelUpdate((prev) => ({ ...prev, copiedFieldKey: copiedKey }))
      if (copyTimeoutId !== null) clearTimeout(copyTimeoutId)
      copyTimeoutId = setTimeout(() => {
        onModelUpdate((prev) => (prev.copiedFieldKey === copiedKey ? { ...prev, copiedFieldKey: null } : prev))
      }, 2000)
    })
  }

  const vaultSync = () => {
    onModelUpdate((prev) => ({ ...prev, busy: true }))
    void messageSend({ type: "manualSync" }).then(async () => {
      await onRefresh()
    })
  }

  const vaultLock = () => {
    onModelUpdate((prev) => ({ ...prev, busy: true }))
    void messageSend({ type: "lock" }).then(async () => {
      await onRefresh()
    })
  }

  const vaultLogout = () => {
    onModelUpdate((prev) => ({ ...prev, busy: true }))
    void messageSend({ type: "logout" }).then(async () => {
      await onRefresh()
    })
  }

  const vaultUnlock = (masterPassword: string) => {
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void messageSend({ type: "unlock", request: { password: masterPassword } }).then(async (res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: res.errorMessage ?? "Unlock failed." }))
        return
      }
      await onRefresh()
    })
  }

  return { loginFill, fieldCopy, totpCopy, vaultSync, vaultLock, vaultLogout, vaultUnlock }
}
