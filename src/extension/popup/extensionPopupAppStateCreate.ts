import type { Result } from "#result"
import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import type { ExtensionPopupCommands } from "./ExtensionPopupCommands.js"
import { extensionPopupCommandsCreate } from "./extensionPopupCommandsCreate.js"
import type { ExtensionPopupViewModel } from "./ExtensionPopupViewModel.js"
import { extensionPopupViewModelCreate } from "./extensionPopupViewModelCreate.js"

export type ExtensionPopupAppOptions = {
  messageSend?: <T = unknown>(message: ExtensionRuntimeMessage) => Promise<Result<T>>
  clipboard?: ExtensionClipboardAdapter
}

export function extensionPopupAppStateCreate(options: ExtensionPopupAppOptions = {}) {
  const sender = options.messageSend ?? extensionRuntimeMessageSend
  const modelSignal = createSignalObject<ExtensionPopupViewModel>(extensionPopupViewModelCreate({ status: "loading" }))

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
  })

  return {
    model: modelSignal.get,
    commands,
    refresh,
  }
}
