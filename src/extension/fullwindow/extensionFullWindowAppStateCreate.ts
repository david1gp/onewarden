import { onMount } from "solid-js"
import type { Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { vaultSortDefault } from "../../shared/vault/vaultSortDefault.js"
import type { VaultSort } from "../../shared/vault/vaultSortSchema.js"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import { extensionGeneratorPreferencesDefault } from "../storage/extensionGeneratorPreferencesDefault.js"
import type { ExtensionGeneratorPreferences } from "../storage/extensionGeneratorPreferencesSchema.js"
import type { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowCommandsCreate } from "./extensionFullWindowCommandsCreate.js"
import { extensionFullWindowViewModelCreate } from "./extensionFullWindowViewModelCreate.js"

type ExtensionGeneratorPreferencesStorage = Pick<
  ReturnType<typeof extensionStorageCreate>,
  "generatorPreferencesLoad" | "generatorPreferencesSave"
>
type ExtensionVaultSortStorage = Pick<ReturnType<typeof extensionStorageCreate>, "vaultSortLoad" | "vaultSortSave">

export type ExtensionFullWindowAppOptions = {
  messageSend?: <T = unknown>(message: ExtensionRuntimeMessage) => Promise<Result<T>>
  clipboard?: ExtensionClipboardAdapter
  storage?: ExtensionGeneratorPreferencesStorage & Partial<ExtensionVaultSortStorage>
}

export function extensionFullWindowAppStateCreate(options: ExtensionFullWindowAppOptions = {}) {
  const sender = options.messageSend ?? extensionRuntimeMessageSend
  const modelSignal = createSignalObject<ExtensionFullWindowViewModel>(
    extensionFullWindowViewModelCreate({ status: "loading" }),
  )
  const generatorPreferencesSignal = createSignalObject<ExtensionGeneratorPreferences>(
    extensionGeneratorPreferencesDefault,
  )
  const generatorPreferencesLoadedSignal = createSignalObject(options.storage === undefined)
  let generatorPreferencesRevision = 0
  let generatorPreferencesSaveQueue = Promise.resolve()
  const vaultSortSignal = createSignalObject<VaultSort>(vaultSortDefault)
  const vaultSortLoadedSignal = createSignalObject(options.storage === undefined)
  let vaultSortRevision = 0
  let vaultSortSaveQueue = Promise.resolve()

  const onModelUpdate = (updater: (prev: ExtensionFullWindowViewModel) => ExtensionFullWindowViewModel) => {
    modelSignal.set(updater(modelSignal.get()))
  }

  const refresh = async (): Promise<void> => {
    const result = await sender<ExtensionFullWindowViewModel>({
      type: "viewModelLoad",
      surface: "fullwindow",
    })
    if (result.success) {
      modelSignal.set(extensionFullWindowViewModelCreate(result.data))
      if (result.data.status === "ready") {
        commands.secureNotesLoad()
        commands.cardsLoad()
        commands.identitiesLoad()
        commands.sshKeysLoad()
        commands.resourcesLoad()
      }
      return
    }
    modelSignal.set({
      ...modelSignal.get(),
      status: "error",
      errorMessage: result.errorMessage,
      busy: false,
    })
  }

  const generatorPreferencesLoad = async (): Promise<void> => {
    if (options.storage === undefined) return
    const revision = generatorPreferencesRevision
    const result = await options.storage.generatorPreferencesLoad()
    if (!result.success) {
      console.error(result.errorMessage)
      generatorPreferencesLoadedSignal.set(true)
      return
    }
    if (revision === generatorPreferencesRevision && result.data !== null) generatorPreferencesSignal.set(result.data)
    generatorPreferencesLoadedSignal.set(true)
  }

  const generatorPreferencesSave = (preferences: ExtensionGeneratorPreferences): void => {
    generatorPreferencesRevision += 1
    generatorPreferencesSignal.set(preferences)
    const storage = options.storage
    if (storage === undefined) return
    generatorPreferencesSaveQueue = generatorPreferencesSaveQueue
      .then(async () => {
        const result = await storage.generatorPreferencesSave(preferences)
        if (!result.success) console.error(result.errorMessage)
      })
      .catch((error: unknown) => {
        console.error("Generator preferences could not be saved.", error)
      })
  }

  const vaultSortLoad = async (): Promise<void> => {
    if (options.storage?.vaultSortLoad === undefined) {
      vaultSortLoadedSignal.set(true)
      return
    }
    const revision = vaultSortRevision
    const result = await options.storage.vaultSortLoad()
    if (!result.success) {
      console.error(result.errorMessage)
      vaultSortLoadedSignal.set(true)
      return
    }
    if (revision === vaultSortRevision && result.data !== null) vaultSortSignal.set(result.data)
    vaultSortLoadedSignal.set(true)
  }

  const vaultSortSave = (sort: VaultSort): void => {
    vaultSortRevision += 1
    vaultSortSignal.set(sort)
    const storage = options.storage
    const save = storage?.vaultSortSave
    if (save === undefined) return
    vaultSortSaveQueue = vaultSortSaveQueue
      .then(async () => {
        const result = await save(sort)
        if (!result.success) console.error(result.errorMessage)
      })
      .catch((error: unknown) => {
        console.error("Vault sort could not be saved.", error)
      })
  }

  const commands: ExtensionFullWindowCommands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: sender,
      clipboard: options.clipboard,
      onModelUpdate,
      onRefresh: refresh,
    },
  )

  onMount(() => {
    void refresh()
    void generatorPreferencesLoad()
    void vaultSortLoad()
  })

  return {
    model: modelSignal.get,
    commands,
    refresh,
    generatorPreferences: generatorPreferencesSignal.get,
    generatorPreferencesLoaded: generatorPreferencesLoadedSignal.get,
    onGeneratorPreferencesChange: generatorPreferencesSave,
    vaultSort: vaultSortSignal.get,
    vaultSortLoaded: vaultSortLoadedSignal.get,
    onVaultSortChange: vaultSortSave,
  }
}
