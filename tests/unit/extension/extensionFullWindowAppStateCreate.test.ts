import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { Result } from "#result"
import {
  type ExtensionFullWindowAppOptions,
  extensionFullWindowAppStateCreate,
} from "../../../src/extension/fullwindow/extensionFullWindowAppStateCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import { extensionGeneratorPreferencesDefault } from "../../../src/extension/storage/extensionGeneratorPreferencesDefault.js"
import type { ExtensionGeneratorPreferences } from "../../../src/extension/storage/extensionGeneratorPreferencesSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import { vaultSortOptions } from "../../../src/shared/vault/vaultSortOptions.js"
import type { VaultSort } from "../../../src/shared/vault/vaultSortSchema.js"

type GeneratorPreferencesStorage = NonNullable<ExtensionFullWindowAppOptions["storage"]>

const messageSend: ExtensionFullWindowAppOptions["messageSend"] = async <T = unknown>(
  _message: ExtensionRuntimeMessage,
): Promise<Result<T>> => resultCreate(extensionFullWindowViewModelCreate({ status: "loggedOut" })) as Result<T>

function appStateRootCreate(storage: GeneratorPreferencesStorage) {
  return createRoot((dispose) => ({
    dispose,
    state: extensionFullWindowAppStateCreate({ messageSend, storage }),
  }))
}

test("extensionFullWindowAppStateCreate hydrates every preference without writing defaults first", async () => {
  const hydratedPreferences: ExtensionGeneratorPreferences = {
    mode: "password",
    password: {
      length: 47,
      characterPolicy: {
        lowercase: false,
        uppercase: true,
        numbers: false,
        symbols: true,
      },
    },
    passphrase: {
      numWords: 11,
      wordSeparator: "·",
      includeNumber: false,
    },
  }
  const saves: ExtensionGeneratorPreferences[] = []
  let resolveLoad: ((result: Result<ExtensionGeneratorPreferences | null>) => void) | undefined
  let loadCalls = 0
  const storage: GeneratorPreferencesStorage = {
    generatorPreferencesLoad: () => {
      loadCalls += 1
      return new Promise((resolve) => {
        resolveLoad = resolve
      })
    },
    generatorPreferencesSave: async (preferences) => {
      saves.push(preferences)
      return resultCreate(undefined)
    },
  }
  const root = appStateRootCreate(storage)

  expect(loadCalls).toBe(1)
  expect(root.state.generatorPreferencesLoaded()).toBe(false)
  expect(root.state.generatorPreferences()).toEqual(extensionGeneratorPreferencesDefault)
  expect(saves).toEqual([])

  resolveLoad?.(resultCreate(hydratedPreferences))
  await Promise.resolve()

  expect(root.state.generatorPreferencesLoaded()).toBe(true)
  expect(root.state.generatorPreferences()).toEqual(hydratedPreferences)
  expect(saves).toEqual([])
  root.dispose()
})

test("extensionFullWindowAppStateCreate falls back to defaults and remains usable when storage fails", async () => {
  const saves: ExtensionGeneratorPreferences[] = []
  const storage: GeneratorPreferencesStorage = {
    generatorPreferencesLoad: async () => resultErrorCreate("test.generatorPreferencesLoad", "Load failed."),
    generatorPreferencesSave: async (preferences) => {
      saves.push(preferences)
      return resultErrorCreate("test.generatorPreferencesSave", "Save failed.")
    },
  }
  const root = appStateRootCreate(storage)

  await Promise.resolve()
  expect(root.state.generatorPreferencesLoaded()).toBe(true)
  expect(root.state.generatorPreferences()).toEqual(extensionGeneratorPreferencesDefault)
  expect(saves).toEqual([])

  const updatedPreferences: ExtensionGeneratorPreferences = {
    ...extensionGeneratorPreferencesDefault,
    mode: "password",
  }
  expect(() => root.state.onGeneratorPreferencesChange(updatedPreferences)).not.toThrow()
  await Promise.resolve()

  expect(root.state.generatorPreferences()).toEqual(updatedPreferences)
  expect(saves).toEqual([updatedPreferences])
  root.dispose()
})

test("extensionFullWindowAppStateCreate keeps the latest preference save ordered during rapid changes", async () => {
  const firstPreferences: ExtensionGeneratorPreferences = {
    ...extensionGeneratorPreferencesDefault,
    mode: "password",
  }
  const secondPreferences: ExtensionGeneratorPreferences = {
    ...firstPreferences,
    password: {
      ...firstPreferences.password,
      length: 32,
    },
  }
  const pendingSaves: Array<{
    preferences: ExtensionGeneratorPreferences
    resolve: (result: Result<void>) => void
  }> = []
  let persistedPreferences: ExtensionGeneratorPreferences | undefined
  const storage: GeneratorPreferencesStorage = {
    generatorPreferencesLoad: async () => resultCreate(null),
    generatorPreferencesSave: (preferences) =>
      new Promise((resolve) => {
        pendingSaves.push({
          preferences,
          resolve: (result) => {
            if (result.success) persistedPreferences = preferences
            resolve(result)
          },
        })
      }),
  }
  const root = appStateRootCreate(storage)
  await Promise.resolve()

  root.state.onGeneratorPreferencesChange(firstPreferences)
  root.state.onGeneratorPreferencesChange(secondPreferences)
  await Promise.resolve()

  expect(pendingSaves.map(({ preferences }) => preferences)).toEqual([firstPreferences])

  pendingSaves[0]?.resolve(resultCreate(undefined))
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(pendingSaves.map(({ preferences }) => preferences)).toEqual([firstPreferences, secondPreferences])

  pendingSaves[1]?.resolve(resultCreate(undefined))
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(persistedPreferences).toEqual(secondPreferences)
  root.dispose()
})

test("extensionFullWindowAppStateCreate does not overwrite a preference changed during hydration", async () => {
  const hydratedPreferences: ExtensionGeneratorPreferences = {
    ...extensionGeneratorPreferencesDefault,
    mode: "password",
  }
  const changedPreferences: ExtensionGeneratorPreferences = {
    ...extensionGeneratorPreferencesDefault,
    passphrase: {
      ...extensionGeneratorPreferencesDefault.passphrase,
      numWords: 8,
    },
  }
  let resolveLoad: ((result: Result<ExtensionGeneratorPreferences | null>) => void) | undefined
  const storage: GeneratorPreferencesStorage = {
    generatorPreferencesLoad: () =>
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    generatorPreferencesSave: async () => resultCreate(undefined),
  }
  const root = appStateRootCreate(storage)

  root.state.onGeneratorPreferencesChange(changedPreferences)
  resolveLoad?.(resultCreate(hydratedPreferences))
  await Promise.resolve()

  expect(root.state.generatorPreferences()).toEqual(changedPreferences)
  expect(root.state.generatorPreferencesLoaded()).toBe(true)
  root.dispose()
})

test("extensionFullWindowAppStateCreate hydrates and saves vault sorting without overwriting a change during hydration", async () => {
  const hydratedSort: VaultSort = "created-newest"
  const changedSort: VaultSort = "updated-oldest"
  let resolveLoad: ((result: Result<VaultSort | null>) => void) | undefined
  const saves: VaultSort[] = []
  const storage: GeneratorPreferencesStorage = {
    generatorPreferencesLoad: async () => resultCreate(null),
    generatorPreferencesSave: async () => resultCreate(undefined),
    vaultSortLoad: () =>
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    vaultSortSave: async (sort) => {
      saves.push(sort)
      return resultCreate(undefined)
    },
  }
  const root = appStateRootCreate(storage)

  expect(root.state.vaultSortLoaded()).toBe(false)
  expect(root.state.vaultSort()).toBe("name-az")
  root.state.onVaultSortChange(changedSort)
  resolveLoad?.(resultCreate(hydratedSort))
  await Promise.resolve()
  await Promise.resolve()

  expect(root.state.vaultSort()).toBe(changedSort)
  expect(root.state.vaultSortLoaded()).toBe(true)
  expect(saves).toEqual([changedSort])
  root.dispose()
})

test("extensionFullWindowAppStateCreate hydrates every persisted vault sort without writing defaults", async () => {
  for (const { value: sort } of vaultSortOptions) {
    const storage: GeneratorPreferencesStorage = {
      generatorPreferencesLoad: async () => resultCreate(null),
      generatorPreferencesSave: async () => resultCreate(undefined),
      vaultSortLoad: async () => resultCreate(sort),
      vaultSortSave: async () => resultCreate(undefined),
    }
    const root = appStateRootCreate(storage)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(root.state.vaultSort()).toBe(sort)
    expect(root.state.vaultSortLoaded()).toBe(true)
    root.dispose()
  }
})

test("extensionFullWindowAppStateCreate falls back to Name A–Z when vault sort storage is invalid", async () => {
  const saves: VaultSort[] = []
  const storage: GeneratorPreferencesStorage = {
    generatorPreferencesLoad: async () => resultCreate(null),
    generatorPreferencesSave: async () => resultCreate(undefined),
    vaultSortLoad: async () => resultErrorCreate("test.vaultSortLoad", "Stored sort is invalid."),
    vaultSortSave: async (sort) => {
      saves.push(sort)
      return resultCreate(undefined)
    },
  }
  const root = appStateRootCreate(storage)

  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(root.state.vaultSort()).toBe("name-az")
  expect(root.state.vaultSortLoaded()).toBe(true)
  expect(saves).toEqual([])
  root.dispose()
})

test("extensionFullWindowAppStateCreate keeps rapid vault sort saves ordered", async () => {
  const pendingSaves: Array<{
    sort: VaultSort
    resolve: (result: Result<void>) => void
  }> = []
  let persistedSort: VaultSort | undefined
  const storage: GeneratorPreferencesStorage = {
    generatorPreferencesLoad: async () => resultCreate(null),
    generatorPreferencesSave: async () => resultCreate(undefined),
    vaultSortLoad: async () => resultCreate(null),
    vaultSortSave: (sort) =>
      new Promise((resolve) => {
        pendingSaves.push({
          sort,
          resolve: (result) => {
            if (result.success) persistedSort = sort
            resolve(result)
          },
        })
      }),
  }
  const root = appStateRootCreate(storage)
  await new Promise((resolve) => setTimeout(resolve, 0))

  root.state.onVaultSortChange("created-oldest")
  root.state.onVaultSortChange("updated-newest")
  await Promise.resolve()
  expect(pendingSaves.map(({ sort }) => sort)).toEqual(["created-oldest"])

  pendingSaves[0]?.resolve(resultCreate(undefined))
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(pendingSaves.map(({ sort }) => sort)).toEqual(["created-oldest", "updated-newest"])

  pendingSaves[1]?.resolve(resultCreate(undefined))
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(root.state.vaultSort()).toBe("updated-newest")
  expect(persistedSort).toBe("updated-newest")
  root.dispose()
})
