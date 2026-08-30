import Dialog from "@corvu/dialog"
import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonCvaIconOnly, buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { buttonIconCva } from "#ui/interactive/button/buttonIconCva.js"
import { classesDialogContentMerge, classesDialogOverlayMerge } from "#ui/interactive/dialog/classesDialogContent.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type CipherDeleteDialogStateProps, cipherDeleteDialogStateCreate } from "./cipherDeleteDialogStateCreate.js"

export function CipherDeleteDialog(props: CipherDeleteDialogStateProps): JSX.Element {
  const state = cipherDeleteDialogStateCreate(props)

  return (
    <Dialog open={state.isOpen()} onOpenChange={state.handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class={classesDialogOverlayMerge()} />
        <Dialog.Content class={classesDialogContentMerge("max-w-md w-full p-0 flex flex-col overflow-hidden")}>
          <div class="relative z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900 shrink-0">
            <div>
              <Dialog.Label class="text-base font-bold text-slate-900 dark:text-slate-50">
                {state.isHard() ? "Delete Permanently" : "Move to Trash"}
              </Dialog.Label>
              <Dialog.Description class="sr-only">
                {state.isHard()
                  ? "This action cannot be undone."
                  : "Items in Trash can be restored or permanently removed."}
              </Dialog.Description>
            </div>
            <Dialog.Close class={buttonCvaIconOnly(buttonVariant.outline, false, false)} title="Close dialog">
              <Icon path={mdiClose} class={buttonIconCva(buttonVariant.outline, "")} />
            </Dialog.Close>
          </div>

          <div class="space-y-4 p-5">
            <Show when={state.errorMessage()}>
              {(err) => (
                <div class="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                  {err()}
                </div>
              )}
            </Show>

            <p class="text-sm text-slate-700 dark:text-slate-300">
              {state.isHard() ? (
                <>
                  Are you sure you want to permanently delete <strong>{state.itemName()}</strong>? All credentials,
                  custom fields, and attachments will be deleted permanently.
                </>
              ) : (
                <>
                  Are you sure you want to move <strong>{state.itemName()}</strong> to the trash?
                </>
              )}
            </p>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 text-sm"
                onClick={state.handleClose}
                disabled={state.isDeleting()}
              >
                <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                Cancel
              </Button>
              <Button
                type="button"
                variant="filledRed"
                size="sm"
                class="h-8 text-sm font-semibold"
                onClick={state.handleConfirm}
                disabled={state.isDeleting()}
              >
                <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                {state.isDeleting() ? "Deleting..." : state.isHard() ? "Delete Permanently" : "Move to Trash"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
