import type { ExtensionStorageAdapter } from "./extensionStorageAdapter.js"
import type { ExtensionStorageArea } from "./extensionStorageArea.js"

type ChromeStorageArea = {
  get<T extends Record<string, unknown> = Record<string, unknown>>(keys?: string | string[] | null): Promise<T>
  set(items: Record<string, unknown>): Promise<void>
  remove(keys: string | string[]): Promise<void>
}

type ChromeStorage = {
  local: ChromeStorageArea
  session: ChromeStorageArea
}

function extensionStorageAreaCreate(area: ChromeStorageArea): ExtensionStorageArea {
  return {
    get: <T extends Record<string, unknown> = Record<string, unknown>>(keys?: string | string[] | null) =>
      area.get<T>(keys),
    set: (items) => area.set(items),
    remove: (keys) => area.remove(keys),
  }
}

export function extensionStorageAdapterCreate(storage: ChromeStorage): ExtensionStorageAdapter {
  return {
    local: extensionStorageAreaCreate(storage.local),
    session: extensionStorageAreaCreate(storage.session),
  }
}
