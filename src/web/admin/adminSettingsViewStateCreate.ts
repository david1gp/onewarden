import type { AdminSettingsOverride } from "./adminSettingsSchema.js"
import type { AdminShellState } from "./AdminShellState.js"

export function adminSettingsViewStateCreate(state: AdminShellState) {
  const toggle = (key: AdminSettingsOverride) => () => state.toggleSetting(key)
  const reset = () =>
    state.requestConfirmation({
      action: "resetSettings",
      entityId: null,
      title: "Reset overridden settings?",
      message: "This will restore all demo settings to their server defaults.",
    })

  return { toggle, reset }
}
