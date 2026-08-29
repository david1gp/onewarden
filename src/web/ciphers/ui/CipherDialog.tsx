import Dialog from "@corvu/dialog"
import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import { type JSX, Show, Switch, Match } from "solid-js"
import { buttonCvaIconOnly, buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { buttonIconCva } from "#ui/interactive/button/buttonIconCva.js"
import { classesDialogContentMerge, classesDialogOverlayMerge } from "#ui/interactive/dialog/classesDialogContent.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { CipherDetailView } from "./CipherDetailView.jsx"
import { CipherEditForm } from "./CipherEditForm.jsx"
import { type CipherDialogStateProps, cipherDialogStateCreate } from "./cipherDialogStateCreate.js"

export function CipherDialog(props: CipherDialogStateProps): JSX.Element {
  const state = cipherDialogStateCreate(props)

  return (
    <Dialog open={state.isOpen()} onOpenChange={state.handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class={classesDialogOverlayMerge()} />
        <Dialog.Content
          class={classesDialogContentMerge("max-w-4xl h-[90vh] max-h-[850px] p-0 flex flex-col overflow-hidden")}
        >
          <header class="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900 shrink-0">
            <div>
              <Dialog.Label class="text-base font-bold text-slate-900 dark:text-slate-50">
                {state.dialogTitle()}
              </Dialog.Label>
              <Dialog.Description class="text-xs text-slate-500">
                {state.mode() === "view"
                  ? "Encrypted vault item credentials and details."
                  : "Fill out the fields to save to your encrypted vault."}
              </Dialog.Description>
            </div>
            <Dialog.Close class={buttonCvaIconOnly(buttonVariant.outline, false, false)} title="Close dialog">
              <Icon path={mdiClose} class={buttonIconCva(buttonVariant.outline, "")} />
            </Dialog.Close>
          </header>

          <div class="flex-1 overflow-hidden">
            <Show
              when={!state.isLoading()}
              fallback={
                <div class="flex h-full items-center justify-center p-8">
                  <div class="flex flex-col items-center gap-2">
                    <div class="size-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <p class="text-xs text-slate-500">Loading cipher details...</p>
                  </div>
                </div>
              }
            >
              <Switch>
                <Match when={state.mode() === "view"}>
                  <CipherDetailView
                    item={state.currentItem}
                    onToggleFavorite={state.handleToggleFavorite}
                    onEdit={state.handleSwitchToEdit}
                    onDelete={state.handleDelete}
                    onRestore={state.handleRestore}
                    onArchive={state.handleArchive}
                    onClone={state.handleClone}
                    onShare={state.handleShare}
                    onUploadAttachment={state.handleUploadAttachment}
                    onDeleteAttachment={state.handleDeleteAttachment}
                  />
                </Match>
                <Match when={state.mode() === "edit" || state.mode() === "create"}>
                  <CipherEditForm
                    initialItem={state.mode() === "edit" ? state.currentItem : undefined}
                    onSave={state.handleSave}
                    onCancel={state.handleClose}
                    isSaving={state.isSaving}
                    errorMessage={state.errorMessage}
                  />
                </Match>
              </Switch>
            </Show>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
