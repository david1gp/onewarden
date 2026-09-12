import { For, type JSX, Show } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ExtensionBadge } from "../ui/ExtensionBadge.jsx"
import { ExtensionCheckbox } from "../ui/ExtensionCheckbox.jsx"
import { ExtensionSelectSingleNative } from "../ui/ExtensionSelectSingleNative.jsx"
import type { ExtensionFullWindowAssignmentSource } from "./ExtensionFullWindowAssignmentSource.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowAssignmentStateCreate } from "./extensionFullWindowAssignmentStateCreate.js"

interface ExtensionFullWindowAssignmentPanelProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  source: () => ExtensionFullWindowAssignmentSource
  idPrefix?: string
}

export function ExtensionFullWindowAssignmentPanel(p: ExtensionFullWindowAssignmentPanelProps): JSX.Element {
  const state = extensionFullWindowAssignmentStateCreate(p.model, () => p.commands, p.source)
  return (
    <section aria-label="Vault assignment" class="extension-boundary flex flex-col gap-2 rounded-lg border p-3">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="font-medium">Assignment</h3>
        <Show when={!state.canEdit()}>
          <ExtensionBadge>Read only</ExtensionBadge>
        </Show>
        <Show when={state.passwordsHidden()}>
          <ExtensionBadge>Passwords hidden</ExtensionBadge>
        </Show>
      </div>
      <Show
        when={state.organizationId() !== null}
        fallback={
          <div class="flex flex-col gap-1">
            <Label for={`${p.idPrefix ?? ""}assignment-folder`}>Folder</Label>
            <ExtensionSelectSingleNative
              id={`${p.idPrefix ?? ""}assignment-folder`}
              disabled={!state.canEdit() || state.busy()}
              valueSignal={state.folderValueSignal}
              getOptions={state.folderOptions}
              valueText={state.folderLabel}
            />
          </div>
        }
      >
        <p class="extension-muted-text text-sm">{state.organizationName()}</p>
        <Show
          when={state.collections().length > 0}
          fallback={<p class="extension-muted-text text-sm">No available collections.</p>}
        >
          <fieldset class="flex flex-col gap-1">
            <legend class="text-sm font-medium">Collections</legend>
            <For each={state.collections()}>
              {(collection) => (
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}assignment-${collection.id}`}
                  checked={state.collectionChecked(collection.id)}
                  disabled={
                    !state.canEdit() || state.busy() || collection.readOnly === true || collection.unmanaged === true
                  }
                  onChange={(checked) => state.collectionToggle(collection.id, checked)}
                >
                  <span>{collection.name}</span>
                  <Show when={collection.manage}>
                    {" "}
                    <ExtensionBadge>Manage</ExtensionBadge>
                  </Show>
                  <Show when={collection.readOnly}>
                    {" "}
                    <ExtensionBadge>Read only</ExtensionBadge>
                  </Show>
                  <Show when={collection.unmanaged}>
                    {" "}
                    <ExtensionBadge>Unmanaged</ExtensionBadge>
                  </Show>
                  <Show when={collection.hidePasswords}>
                    {" "}
                    <ExtensionBadge>Passwords hidden</ExtensionBadge>
                  </Show>
                </ExtensionCheckbox>
              )}
            </For>
          </fieldset>
        </Show>
      </Show>
      <Show when={state.lockedAssignment()}>
        <p role="status" class="extension-muted-text text-xs">
          Assignments cannot be changed while this item belongs to a read-only or unmanaged collection.
        </p>
      </Show>
      <Button
        variant="outline"
        size="sm"
        disabled={!state.canEdit() || state.busy() || state.lockedAssignment()}
        onClick={state.save}
      >
        Save assignment
      </Button>
    </section>
  )
}
