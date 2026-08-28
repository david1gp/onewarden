import type { ExtensionFullWindowCreatePrefill } from "./ExtensionFullWindowCreatePrefill.js"
import type { ExtensionFullWindowCreateStatus } from "./ExtensionFullWindowCreateStatus.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"
import type { ExtensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import type { ExtensionFullWindowLogin } from "./ExtensionFullWindowLogin.js"
import type { ExtensionFullWindowStatus } from "./ExtensionFullWindowStatus.js"

/** Read-only rendering model of the full-window vault; the view never touches browser APIs. */
export interface ExtensionFullWindowViewModel {
  status: ExtensionFullWindowStatus
  /** Hostname of the active tab, or null when no fillable tab exists. */
  hostname: string | null
  logins: ExtensionFullWindowLogin[]
  errorMessage: string | null
  busy: boolean
  copiedFieldKey: string | null
  /** True when an active tab can receive an explicit fill. */
  fillAvailable: boolean
  environment: ExtensionFullWindowEnvironmentSettings
  /** Lifecycle of the environment settings submission. */
  environmentSaveStatus: ExtensionFullWindowEnvironmentSaveStatus
  /** Lifecycle of the create-login submission. */
  createStatus: ExtensionFullWindowCreateStatus
  /** Name and URI the popup suggests for a new entry from the active site. */
  createPrefill: ExtensionFullWindowCreatePrefill
  /** Id of the entry the last create produced, so the vault can select it. */
  createdLoginId: string | null
}
