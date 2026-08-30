import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminShellState } from "./AdminShellState.js"
import type {
  AdminSettingsBooleanKey,
  AdminSettingsNumberKey,
  AdminSettingsOverride,
  AdminSettingsPasswordKey,
  AdminSettingsTextKey,
} from "./adminSettingsSchema.js"

const passwordKeys: readonly AdminSettingsPasswordKey[] = [
  "hibpApiKey",
  "adminToken",
  "ssoClientSecret",
  "smtpPassword",
  "yubicoSecretKey",
  "duoSkey",
  "databaseUrl",
]

export function adminSettingsViewStateCreate(state: AdminShellState) {
  const passwordVisibility = createSignalObject<Record<AdminSettingsPasswordKey, boolean>>({
    hibpApiKey: false,
    adminToken: false,
    ssoClientSecret: false,
    smtpPassword: false,
    yubicoSecretKey: false,
    duoSkey: false,
    databaseUrl: false,
  })

  const toggle = (key: AdminSettingsBooleanKey) => () => state.toggleSetting(key)
  const textInput = (key: AdminSettingsTextKey) => (event: InputEvent & { currentTarget: HTMLInputElement }) =>
    state.updateTextSetting(key, event.currentTarget.value)
  const numberInput = (key: AdminSettingsNumberKey) => (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    const value = Number(event.currentTarget.value)
    if (!Number.isInteger(value)) return
    state.updateNumberSetting(key, value)
  }
  const reset = () =>
    state.requestConfirmation({
      action: "resetSettings",
      entityId: null,
      title: "Reset overridden settings?",
      message: "This will restore all demo settings to their server defaults.",
    })
  const save = (event: SubmitEvent) => {
    event.preventDefault()
    state.saveSettings()
  }
  const preventEnter = (event: KeyboardEvent) => {
    if (event.key === "Enter") event.preventDefault()
  }
  const togglePasswordVisibility = (key: AdminSettingsPasswordKey) => () => {
    if (!passwordKeys.includes(key)) return
    const current = passwordVisibility.get()
    passwordVisibility.set({ ...current, [key]: !current[key] })
  }
  const passwordVisible = (key: AdminSettingsPasswordKey) => passwordVisibility.get()[key]
  const passwordType = (key: AdminSettingsPasswordKey) => (passwordVisible(key) ? "text" : "password")
  const passwordToggleLabel = (key: AdminSettingsPasswordKey) => (passwordVisible(key) ? "Hide value" : "Show value")
  const disabled = (key: AdminSettingsOverride) => () => state.settingDisabled(key)
  const configOverridden = (key: AdminSettingsOverride) => () => state.settingConfigOverridden(key)
  const environmentOverridden = (key: AdminSettingsOverride) => () => state.settingEnvironmentOverridden(key)
  const notifySuccess = (message: string) => state.showFeedback({ kind: "success", message })
  const notifyError = (message: string) => state.showFeedback({ kind: "error", message })

  return {
    toggle,
    textInput,
    numberInput,
    reset,
    save,
    preventEnter,
    togglePasswordVisibility,
    passwordVisible,
    passwordType,
    passwordToggleLabel,
    disabled,
    configOverridden,
    environmentOverridden,
    notifySuccess,
    notifyError,
  }
}
