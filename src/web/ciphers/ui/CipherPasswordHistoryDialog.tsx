import Dialog from "@corvu/dialog"
import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import { type JSX } from "solid-js"
import { buttonCvaIconOnly, buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { buttonIconCva } from "#ui/interactive/button/buttonIconCva.js"
import { classesDialogContentMerge, classesDialogOverlayMerge } from "#ui/interactive/dialog/classesDialogContent.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { CipherPasswordHistoryList } from "./CipherPasswordHistoryList.jsx"
import {
  type CipherPasswordHistoryDialogStateProps,
  cipherPasswordHistoryDialogStateCreate,
} from "./cipherPasswordHistoryDialogStateCreate.js"

export function CipherPasswordHistoryDialog(props: CipherPasswordHistoryDialogStateProps): JSX.Element {
  const state = cipherPasswordHistoryDialogStateCreate(props)

  return (
    <Dialog open={state.isOpen()} onOpenChange={state.handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class={classesDialogOverlayMerge()} />
        <Dialog.Content
          class={classesDialogContentMerge("max-w-lg w-full p-0 flex flex-col overflow-hidden max-h-[80vh]")}
        >
          <div class="relative z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900 shrink-0">
            <div>
              <Dialog.Label class="text-base font-bold text-slate-900 dark:text-slate-50">
                Password History
              </Dialog.Label>
              <Dialog.Description class="sr-only">
                Previous passwords saved for this login item ({state.count()} recorded).
              </Dialog.Description>
            </div>
            <Dialog.Close class={buttonCvaIconOnly(buttonVariant.outline, false, false)} title="Close dialog">
              <Icon path={mdiClose} class={buttonIconCva(buttonVariant.outline, "")} />
            </Dialog.Close>
          </div>

          <div class="flex-1 overflow-y-auto p-5">
            <CipherPasswordHistoryList entries={state.entries} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
