import type { Result } from "#result"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import { extensionClipboardAdapterCreate } from "../clipboard/extensionClipboardAdapterCreate.js"
import { extensionCommonCommandsCreate } from "../commands/extensionCommonCommandsCreate.js"
import type { ExtensionCopyableField } from "../ExtensionCopyableField.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import { extensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"
import { extensionFullWindowSecuritySaveStatus } from "./ExtensionFullWindowSecuritySaveStatus.js"
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
    ExtensionLogin,
    ExtensionCopyableField,
    ExtensionFullWindowViewModel
  >({
    messageSend: sender,
    clipboard,
    onModelUpdate,
    onRefresh,
  })

  const handoffOpen = (request: Extract<ExtensionRuntimeMessage, { type: "sessionHandoffOpen" }>["request"]) => {
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void sender({ type: "sessionHandoffOpen", request }).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({
          ...prev,
          busy: false,
          errorMessage: res.errorMessage ?? "OneWarden could not be opened.",
        }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: null }))
    })
  }

  const loginAdd = () => handoffOpen({ operation: "create", cipherId: null })
  const loginEdit = (login: ExtensionLogin) => handoffOpen({ operation: "edit", cipherId: login.id })

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

  const lockPolicySave = (policy: ExtensionLockPolicy) => {
    onModelUpdate((prev) => ({
      ...prev,
      busy: true,
      errorMessage: null,
      securitySaveStatus: extensionFullWindowSecuritySaveStatus.saving,
    }))
    void sender({ type: "lockPolicySave", request: policy }).then(async (res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({
          ...prev,
          busy: false,
          securitySaveStatus: extensionFullWindowSecuritySaveStatus.error,
          errorMessage: res.errorMessage ?? "Security settings save failed.",
        }))
        return
      }
      await onRefresh()
      onModelUpdate((prev) => {
        if (prev.status === "error") {
          return {
            ...prev,
            busy: false,
            securitySaveStatus: extensionFullWindowSecuritySaveStatus.error,
            errorMessage: prev.errorMessage ?? "Security settings could not be refreshed.",
          }
        }
        return {
          ...prev,
          busy: false,
          securitySaveStatus: extensionFullWindowSecuritySaveStatus.saved,
          errorMessage: null,
        }
      })
    })
  }

  return {
    loginFill: commonCommands.loginFill,
    fieldCopy: commonCommands.fieldCopy,
    totpCopy: commonCommands.totpCopy,
    loginAdd,
    loginEdit,
    vaultSync: commonCommands.vaultSync,
    vaultLock: commonCommands.vaultLock,
    vaultLogout: commonCommands.vaultLogout,
    vaultUnlock: commonCommands.vaultUnlock,
    accountLogin,
    environmentSave,
    lockPolicySave,
    ...overrides,
  }
}
