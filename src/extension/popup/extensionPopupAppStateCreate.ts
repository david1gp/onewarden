import { onMount } from "solid-js"
import type { Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import { extensionGeneratorPreferencesDefault } from "../storage/extensionGeneratorPreferencesDefault.js"
import type { ExtensionGeneratorPreferences } from "../storage/extensionGeneratorPreferencesSchema.js"
import type { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import type { ExtensionPopupCommands } from "./ExtensionPopupCommands.js"
import type { ExtensionPopupViewModel } from "./ExtensionPopupViewModel.js"
import { extensionPopupCommandsCreate } from "./extensionPopupCommandsCreate.js"
import { extensionPopupViewModelCreate } from "./extensionPopupViewModelCreate.js"

export type ExtensionPopupAppOptions = {
  messageSend?: <T = unknown>(message: ExtensionRuntimeMessage) => Promise<Result<T>>
  clipboard?: ExtensionClipboardAdapter
  storage?: Pick<ReturnType<typeof extensionStorageCreate>, "generatorPreferencesLoad" | "generatorPreferencesSave">
}

export function extensionPopupAppStateCreate(options: ExtensionPopupAppOptions = {}) {
  const sender = options.messageSend ?? extensionRuntimeMessageSend
  const modelSignal = createSignalObject<ExtensionPopupViewModel>(extensionPopupViewModelCreate({ status: "loading" }))
  const generatorPreferencesSignal = createSignalObject<ExtensionGeneratorPreferences>(
    extensionGeneratorPreferencesDefault,
  )
  const generatorPreferencesLoadedSignal = createSignalObject(options.storage === undefined)
  let generatorPreferencesRevision = 0
  let generatorPreferencesSaveQueue = Promise.resolve()

  const onModelUpdate = (updater: (prev: ExtensionPopupViewModel) => ExtensionPopupViewModel) => {
    modelSignal.set(updater(modelSignal.get()))
  }

  const refresh = async (): Promise<void> => {
    const result = await sender<ExtensionPopupViewModel>({
      type: "viewModelLoad",
      surface: "popup",
    })
    if (result.success) {
      modelSignal.set(result.data)
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
    if (options.storage === undefined) return
    generatorPreferencesSaveQueue = generatorPreferencesSaveQueue
      .then(async () => {
        const result = await options.storage?.generatorPreferencesSave(preferences)
        if (result !== undefined && !result.success) console.error(result.errorMessage)
      })
      .catch((error: unknown) => console.error("Generator preferences could not be saved.", error))
  }

  const commands: ExtensionPopupCommands = extensionPopupCommandsCreate(
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
  })

  return {
    model: modelSignal.get,
    commands,
    refresh,
    generatorPreferences: generatorPreferencesSignal.get,
    generatorPreferencesLoaded: generatorPreferencesLoadedSignal.get,
    onGeneratorPreferencesChange: generatorPreferencesSave,
  }
}
