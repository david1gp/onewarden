import Dialog from "@corvu/dialog"
import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import { type JSX, Show } from "solid-js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { LabelAsterix } from "#ui/input/label/LabelAsterix.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonCvaIconOnly, buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { buttonIconCva } from "#ui/interactive/button/buttonIconCva.js"
import { classesDialogContentMerge, classesDialogOverlayMerge } from "#ui/interactive/dialog/classesDialogContent.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { type CipherShareDialogStateProps, cipherShareDialogStateCreate } from "./cipherShareDialogStateCreate.js"

export function CipherShareDialog(props: CipherShareDialogStateProps): JSX.Element {
  const state = cipherShareDialogStateCreate(props)

  return (
    <Dialog open={state.isOpen()} onOpenChange={state.handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class={classesDialogOverlayMerge()} />
        <Dialog.Content
          class={classesDialogContentMerge("max-w-lg w-full p-0 flex flex-col overflow-hidden max-h-[85vh]")}
        >
          <header class="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900 shrink-0">
            <div>
              <Dialog.Label class="text-base font-bold text-slate-900 dark:text-slate-50">
                {state.isAlreadyShared() ? "Manage Collections" : "Share to Organization"}
              </Dialog.Label>
              <Dialog.Description class="text-xs text-slate-500">
                {state.isAlreadyShared()
                  ? `Update organization collection assignments for "${state.itemName()}".`
                  : `Transfer or share "${state.itemName()}" with an organization.`}
              </Dialog.Description>
            </div>
            <Dialog.Close class={buttonCvaIconOnly(buttonVariant.outline, false, false)} title="Close dialog">
              <Icon path={mdiClose} class={buttonIconCva(buttonVariant.outline, "")} />
            </Dialog.Close>
          </header>

          <form onSubmit={state.handleShare} class="space-y-4 p-5">
            <Show when={state.errorMessage()}>
              {(err) => (
                <div class="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                  {err()}
                </div>
              )}
            </Show>

            <div class="space-y-1">
              <Label for="cipher-share-org-id" class="text-xs font-medium">
                Organization ID <LabelAsterix />
              </Label>
              <InputS
                id="cipher-share-org-id"
                type="text"
                placeholder="e.g. org-123456"
                valueSignal={state.organizationId}
                class="h-9 w-full text-xs"
                required
                disabled={state.isAlreadyShared()}
              />
            </div>

            <div class="space-y-1">
              <Label for="cipher-share-collections" class="text-xs font-medium">
                Collection IDs (comma-separated) <LabelAsterix />
              </Label>
              <InputS
                id="cipher-share-collections"
                type="text"
                placeholder="e.g. col-dev, col-general"
                valueSignal={state.collectionIdsText}
                class="h-9 w-full text-xs"
                required
              />
              <p class="text-[11px] text-slate-400">
                Specify one or more collection IDs that members of your organization can access.
              </p>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="text-xs"
                onClick={state.handleClose}
                disabled={state.isSharing()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="filledBlue"
                size="sm"
                class="text-xs font-semibold"
                disabled={state.isSharing()}
              >
                {state.isSharing() ? "Saving..." : state.isAlreadyShared() ? "Update Collections" : "Share Item"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
