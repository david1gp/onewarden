import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"
import { extensionFullWindowRegion } from "./ExtensionFullWindowRegion.js"

/** Empty environment settings defaulting to the official US region. */
export function extensionFullWindowEnvironmentSettingsCreate(
  overrides: Partial<ExtensionFullWindowEnvironmentSettings> = {},
): ExtensionFullWindowEnvironmentSettings {
  return {
    region: extensionFullWindowRegion.us,
    base: "",
    webVault: "",
    api: "",
    identity: "",
    icons: "",
    notifications: "",
    events: "",
    ...overrides,
  }
}
