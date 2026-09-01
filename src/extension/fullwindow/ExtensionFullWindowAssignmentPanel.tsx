import { For, type JSX, Show } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
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
    <section
      aria-label="Vault assignment"
      class="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
    >
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="font-medium">Assignment</h3>
        <Show when={!state.canEdit()}>
          <Badge>Read only</Badge>
        </Show>
        <Show when={state.passwordsHidden()}>
          <Badge>Passwords hidden</Badge>
        </Show>
      </div>
      <Show
        when={state.organizationId() !== null}
        fallback={
          <div class="flex flex-col gap-1">
            <Label for={`${p.idPrefix ?? ""}assignment-folder`}>Folder</Label>
            <SelectSingleNative
              id={`${p.idPrefix ?? ""}assignment-folder`}
              disabled={!state.canEdit() || state.busy()}
              valueSignal={state.folderValueSignal}
              getOptions={state.folderOptions}
              valueText={state.folderLabel}
            />
          </div>
        }
      >
        <p class="text-sm text-slate-600 dark:text-slate-300">{state.organizationName()}</p>
        <Show
          when={state.collections().length > 0}
          fallback={<p class="text-sm text-slate-600 dark:text-slate-300">No available collections.</p>}
        >
          <fieldset class="flex flex-col gap-1">
            <legend class="text-sm font-medium">Collections</legend>
            <For each={state.collections()}>
              {(collection) => (
                <Checkbox
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
                    <Badge>Manage</Badge>
                  </Show>
                  <Show when={collection.readOnly}>
                    {" "}
                    <Badge>Read only</Badge>
                  </Show>
                  <Show when={collection.unmanaged}>
                    {" "}
                    <Badge>Unmanaged</Badge>
                  </Show>
                  <Show when={collection.hidePasswords}>
                    {" "}
                    <Badge>Passwords hidden</Badge>
                  </Show>
                </Checkbox>
              )}
            </For>
          </fieldset>
        </Show>
      </Show>
      <Show when={state.lockedAssignment()}>
        <p role="status" class="text-xs text-slate-600 dark:text-slate-300">
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
