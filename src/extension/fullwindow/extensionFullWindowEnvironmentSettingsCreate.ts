import { extensionEnvironmentDefaultSource } from "../api/extensionEnvironmentDefaultSource.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"
import { extensionFullWindowRegion } from "./ExtensionFullWindowRegion.js"

/** Environment settings defaulting to the self-hosted OneWarden server. */
export function extensionFullWindowEnvironmentSettingsCreate(
  overrides: Partial<ExtensionFullWindowEnvironmentSettings> = {},
): ExtensionFullWindowEnvironmentSettings {
  return {
    region: extensionFullWindowRegion.selfHosted,
    base: extensionEnvironmentDefaultSource.base,
    webVault: "",
    api: "",
    identity: "",
    icons: "",
    notifications: "",
    events: "",
    ...overrides,
  }
}
