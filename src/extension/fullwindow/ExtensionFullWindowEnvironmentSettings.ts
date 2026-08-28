import type { ExtensionFullWindowRegion } from "./ExtensionFullWindowRegion.js"

/**
 * Environment configuration as edited in the full-window settings pane.
 * `base` derives every location; each override, when non-empty, replaces one derived location.
 */
export interface ExtensionFullWindowEnvironmentSettings {
  region: ExtensionFullWindowRegion
  base: string
  webVault: string
  api: string
  identity: string
  icons: string
  notifications: string
  events: string
}
