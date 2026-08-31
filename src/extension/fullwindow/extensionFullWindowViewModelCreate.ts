import { extensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import { extensionFullWindowStatus } from "./ExtensionFullWindowStatus.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowEnvironmentSettingsCreate } from "./extensionFullWindowEnvironmentSettingsCreate.js"

/** Initial full-window read model used before background messaging is wired up. */
export function extensionFullWindowViewModelCreate(
  overrides: Partial<ExtensionFullWindowViewModel> = {},
): ExtensionFullWindowViewModel {
  return {
    status: extensionFullWindowStatus.loading,
    hostname: null,
    logins: [],
    errorMessage: null,
    busy: false,
    copiedFieldKey: null,
    fillAvailable: false,
    environment: extensionFullWindowEnvironmentSettingsCreate(),
    environmentSaveStatus: extensionFullWindowEnvironmentSaveStatus.idle,
    ...overrides,
  }
}
