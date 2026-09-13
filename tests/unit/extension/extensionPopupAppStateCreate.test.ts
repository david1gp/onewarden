import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { Result } from "#result"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import {
  type ExtensionPopupAppOptions,
  extensionPopupAppStateCreate,
} from "../../../src/extension/popup/extensionPopupAppStateCreate.js"
import { extensionPopupViewModelCreate } from "../../../src/extension/popup/extensionPopupViewModelCreate.js"
import { extensionGeneratorPreferencesDefault } from "../../../src/extension/storage/extensionGeneratorPreferencesDefault.js"
import type { ExtensionGeneratorPreferences } from "../../../src/extension/storage/extensionGeneratorPreferencesSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"

type PopupStorage = NonNullable<ExtensionPopupAppOptions["storage"]>

const messageSend: ExtensionPopupAppOptions["messageSend"] = async <T = unknown>(
  _message: ExtensionRuntimeMessage,
): Promise<Result<T>> => resultCreate(extensionPopupViewModelCreate({ status: "loggedOut" })) as Result<T>

function appStateRootCreate(storage: PopupStorage) {
  return createRoot((dispose) => ({
    dispose,
    state: extensionPopupAppStateCreate({ messageSend, storage }),
  }))
}

const preferencesStorage: Pick<PopupStorage, "generatorPreferencesLoad" | "generatorPreferencesSave"> = {
  generatorPreferencesLoad: async () => resultCreate(extensionGeneratorPreferencesDefault),
  generatorPreferencesSave: async (_preferences: ExtensionGeneratorPreferences) => resultCreate(undefined),
}

test("extensionPopupAppStateCreate hydrates the persisted content pane without writing defaults", async () => {
  let resolveLoad: ((result: Awaited<ReturnType<PopupStorage["popupPaneLoad"]>>) => void) | undefined
  const saves: Array<"vault" | "generator"> = []
  const storage: PopupStorage = {
    ...preferencesStorage,
    popupPaneLoad: () =>
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    popupPaneSave: async (pane) => {
      saves.push(pane)
      return resultCreate(undefined)
    },
  }
  const root = appStateRootCreate(storage)

  expect(root.state.popupPaneLoaded()).toBe(false)
  expect(root.state.popupPane()).toBe("vault")
  expect(saves).toEqual([])

  resolveLoad?.(resultCreate("generator"))
  await Promise.resolve()

  expect(root.state.popupPaneLoaded()).toBe(true)
  expect(root.state.popupPane()).toBe("generator")
  expect(saves).toEqual([])
  root.dispose()
})

test("extensionPopupAppStateCreate falls back to Vault when pane storage fails", async () => {
  const storage: PopupStorage = {
    ...preferencesStorage,
    popupPaneLoad: async () => resultErrorCreate("test.popupPaneLoad", "Load failed."),
    popupPaneSave: async () => resultCreate(undefined),
  }
  const root = appStateRootCreate(storage)

  await Promise.resolve()

  expect(root.state.popupPaneLoaded()).toBe(true)
  expect(root.state.popupPane()).toBe("vault")
  root.dispose()
})
