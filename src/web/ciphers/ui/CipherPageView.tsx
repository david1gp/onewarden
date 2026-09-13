import { type JSX, Match, Show, Switch } from "solid-js"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { CipherDetailView } from "./CipherDetailView.jsx"
import { CipherEditForm } from "./CipherEditForm.jsx"
import type { CipherPageViewProps } from "./cipherPageViewProps.js"

export function CipherPageView(props: CipherPageViewProps): JSX.Element {
  const state = props.state

  return (
    <div class="flex h-full w-full flex-col bg-white dark:bg-slate-900">
      <div class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <Show when={props.onNavigateBack}>
          <ButtonIcon
            variant="ghost"
            size="sm"
            icon={vaultSvgIcons.arrowLeft}
            iconClass="size-3.5 mr-1"
            onClick={props.onNavigateBack}
            class="h-8 text-sm text-slate-600 dark:text-slate-300"
          >
            Back to Vault
          </ButtonIcon>
        </Show>
      </div>

      <div class="flex-1 overflow-hidden">
        <Show
          when={!state.isLoading()}
          fallback={
            <div class="flex h-full items-center justify-center p-8">
              <div class="flex flex-col items-center gap-2">
                <div class="size-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p class="text-sm text-slate-600 dark:text-slate-400">Loading cipher...</p>
              </div>
            </div>
          }
        >
          <Switch>
            <Match when={state.mode() === "view"}>
              <CipherDetailView state={state.detailState} />
            </Match>
            <Match when={state.mode() === "edit" || state.mode() === "create"}>
              <CipherEditForm
                initialItem={state.mode() === "edit" ? state.currentItem : undefined}
                defaultUri={props.defaultUri}
                onSave={state.handleSave}
                onCancel={state.handleCancel}
                isSaving={state.isSaving}
                errorMessage={state.errorMessage}
              />
            </Match>
          </Switch>
        </Show>
      </div>
    </div>
  )
}
