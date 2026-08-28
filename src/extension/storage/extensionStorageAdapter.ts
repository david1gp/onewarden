import type { ExtensionStorageArea } from "./extensionStorageArea.js"

export type ExtensionStorageAdapter = {
  local: ExtensionStorageArea
  session: ExtensionStorageArea
}
