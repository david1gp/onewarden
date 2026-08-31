import type { Result } from "#result"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import { extensionClipboardAdapterCreate } from "../clipboard/extensionClipboardAdapterCreate.js"
import { extensionCommonCommandsCreate } from "../commands/extensionCommonCommandsCreate.js"
import type { ExtensionCreateLoginRequest } from "../create/extensionCreateLoginRequestSchema.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowCopyableField } from "./ExtensionFullWindowCopyableField.js"
import { extensionFullWindowCreateStatus } from "./ExtensionFullWindowCreateStatus.js"
import { extensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"
import type { ExtensionFullWindowLogin } from "./ExtensionFullWindowLogin.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowEnvironmentSettingsCreate } from "./extensionFullWindowEnvironmentSettingsCreate.js"
import { extensionHostPermissionRequest } from "./extensionHostPermissionRequest.js"

export type ExtensionFullWindowCommandsOptions = {
  messageSend?: (message: ExtensionRuntimeMessage) => Promise<Result<any>>
  clipboard?: ExtensionClipboardAdapter
  hostPermissionRequest?: (environment: ExtensionFullWindowEnvironmentSettings) => Promise<Result<void>>
  onModelUpdate?: (updater: (prev: ExtensionFullWindowViewModel) => ExtensionFullWindowViewModel) => void
  onRefresh?: () => Promise<void>
}

/**
 * Full-window commands dispatch typed runtime messages to the background worker
 * and manage copy feedback, busy states, create workflows, and view model refresh.
 */
export function extensionFullWindowCommandsCreate(
  overrides: Partial<ExtensionFullWindowCommands> = {},
  options: ExtensionFullWindowCommandsOptions = {},
): ExtensionFullWindowCommands {
  const sender = options.messageSend ?? extensionRuntimeMessageSend
  const clipboard = options.clipboard ?? extensionClipboardAdapterCreate()
  const hostPermissionRequest = options.hostPermissionRequest ?? extensionHostPermissionRequest
  const onModelUpdate = options.onModelUpdate ?? (() => {})
  const onRefresh = options.onRefresh ?? (async () => {})

  const commonCommands = extensionCommonCommandsCreate<
    ExtensionFullWindowLogin,
    ExtensionFullWindowCopyableField,
    ExtensionFullWindowViewModel
  >({
    messageSend: sender,
    clipboard,
    onModelUpdate,
    onRefresh,
  })

  const loginAdd = () => {}

  const loginCreate = (request: ExtensionCreateLoginRequest) => {
    onModelUpdate((prev) => ({ ...prev, createStatus: extensionFullWindowCreateStatus.saving, errorMessage: null }))
    void sender({ type: "createLogin", request }).then(async (res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({
          ...prev,
          createStatus: extensionFullWindowCreateStatus.error,
          errorMessage: res.errorMessage ?? "Creation failed.",
        }))
        return
      }
      const data = res.data as { id?: string } | undefined
      onModelUpdate((prev) => ({
        ...prev,
        createStatus: extensionFullWindowCreateStatus.saved,
        createdLoginId: data?.id ?? null,
      }))
      await onRefresh()
    })
  }

  const loginDraftSave = (request: ExtensionCreateLoginRequest) => {
    void sender({ type: "draftSave", request })
  }

  const loginDraftDiscard = (draftId: string) => {
    void sender({ type: "draftDiscard", request: draftId })
  }

  const accountLogin = (
    credentials?: { email: string; password: string },
    environment: ExtensionFullWindowEnvironmentSettings = extensionFullWindowEnvironmentSettingsCreate(),
  ) => {
    if (credentials === undefined) return
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void hostPermissionRequest(environment).then(async (permissionResult) => {
      if (!permissionResult.success) {
        onModelUpdate((prev) => ({
          ...prev,
          busy: false,
          errorMessage: permissionResult.errorMessage ?? "Server access permission was not granted.",
        }))
        return
      }
      const res = await sender({ type: "login", request: credentials })
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: res.errorMessage ?? "Login failed." }))
        return
      }
      await onRefresh()
    })
  }

  const environmentSave = (environment: ExtensionFullWindowEnvironmentSettings) => {
    onModelUpdate((prev) => ({
      ...prev,
      busy: true,
      errorMessage: null,
      environmentSaveStatus: extensionFullWindowEnvironmentSaveStatus.saving,
    }))
    void hostPermissionRequest(environment).then(async (permissionResult) => {
      if (!permissionResult.success) {
        onModelUpdate((prev) => ({
          ...prev,
          busy: false,
          environmentSaveStatus: extensionFullWindowEnvironmentSaveStatus.error,
          errorMessage: permissionResult.errorMessage ?? "Server access permission was not granted.",
        }))
        return
      }
      const res = await sender({ type: "environmentSave", request: environment })
      if (!res.success) {
        onModelUpdate((prev) => ({
          ...prev,
          busy: false,
          environmentSaveStatus: extensionFullWindowEnvironmentSaveStatus.error,
          errorMessage: res.errorMessage ?? "Settings save failed.",
        }))
        return
      }
      await onRefresh()
      onModelUpdate((prev) => ({
        ...prev,
        busy: false,
        environmentSaveStatus: extensionFullWindowEnvironmentSaveStatus.saved,
        errorMessage: null,
      }))
    })
  }

  return {
    loginFill: commonCommands.loginFill,
    fieldCopy: commonCommands.fieldCopy,
    totpCopy: commonCommands.totpCopy,
    loginAdd,
    loginCreate,
    loginDraftSave,
    loginDraftDiscard,
    vaultSync: commonCommands.vaultSync,
    vaultLock: commonCommands.vaultLock,
    vaultLogout: commonCommands.vaultLogout,
    vaultUnlock: commonCommands.vaultUnlock,
    accountLogin,
    environmentSave,
    ...overrides,
  }
}
