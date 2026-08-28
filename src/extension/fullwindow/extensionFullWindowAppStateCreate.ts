import type { Result } from "#result"
import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import { extensionFullWindowCommandsCreate } from "./extensionFullWindowCommandsCreate.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowViewModelCreate } from "./extensionFullWindowViewModelCreate.js"

export type ExtensionFullWindowAppOptions = {
  messageSend?: <T = unknown>(message: ExtensionRuntimeMessage) => Promise<Result<T>>
  clipboard?: ExtensionClipboardAdapter
}

export function extensionFullWindowAppStateCreate(options: ExtensionFullWindowAppOptions = {}) {
  const sender = options.messageSend ?? extensionRuntimeMessageSend
  const modelSignal = createSignalObject<ExtensionFullWindowViewModel>(
    extensionFullWindowViewModelCreate({ status: "loading" }),
  )

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
  })

  return {
    model: modelSignal.get,
    commands,
    refresh,
  }
}
