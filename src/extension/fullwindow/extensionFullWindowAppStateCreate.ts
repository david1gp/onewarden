import { onMount } from "solid-js"
import type { Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import type { ExtensionGeneratorPreferences } from "../storage/extensionGeneratorPreferencesSchema.js"
import { extensionGeneratorPreferencesDefault } from "../storage/extensionGeneratorPreferencesDefault.js"
import type { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowCommandsCreate } from "./extensionFullWindowCommandsCreate.js"
import { extensionFullWindowViewModelCreate } from "./extensionFullWindowViewModelCreate.js"

type ExtensionGeneratorPreferencesStorage = Pick<
  ReturnType<typeof extensionStorageCreate>,
  "generatorPreferencesLoad" | "generatorPreferencesSave"
>

export type ExtensionFullWindowAppOptions = {
  messageSend?: <T = unknown>(message: ExtensionRuntimeMessage) => Promise<Result<T>>
  clipboard?: ExtensionClipboardAdapter
  storage?: ExtensionGeneratorPreferencesStorage
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

  const onModelUpdate = (updater: (prev: ExtensionFullWindowViewModel) => ExtensionFullWindowViewModel) => {
    modelSignal.set(updater(modelSignal.get()))
  }

  const refresh = async (): Promise<void> => {
    const result = await sender<ExtensionFullWindowViewModel>({
      type: "viewModelLoad",
      surface: "fullwindow",
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
    const result = await options.storage.generatorPreferencesLoad()
    if (!result.success) {
      console.error(result.errorMessage)
      generatorPreferencesLoadedSignal.set(true)
      return
    }
    if (result.data !== null) generatorPreferencesSignal.set(result.data)
    generatorPreferencesLoadedSignal.set(true)
  }

  const generatorPreferencesSave = (preferences: ExtensionGeneratorPreferences): void => {
    generatorPreferencesSignal.set(preferences)
    if (options.storage === undefined) return
    void options.storage.generatorPreferencesSave(preferences).then((result) => {
      if (!result.success) console.error(result.errorMessage)
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
