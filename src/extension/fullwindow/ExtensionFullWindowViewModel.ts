import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import type { ExtensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"
import type { ExtensionFullWindowLogin } from "./ExtensionFullWindowLogin.js"
import type { ExtensionFullWindowSecuritySaveStatus } from "./ExtensionFullWindowSecuritySaveStatus.js"
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
  /** Persisted inactivity timeout policy, or null when no policy has been saved. */
  lockPolicy: ExtensionLockPolicy | null
  /** Lifecycle of the security settings submission. */
  securitySaveStatus: ExtensionFullWindowSecuritySaveStatus
}
