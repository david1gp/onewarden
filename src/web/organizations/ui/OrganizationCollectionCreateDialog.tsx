import { For, type JSX, Show } from "solid-js"
import { CorvuDialog } from "#ui/interactive/dialog/CorvuDialog.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import {
  type OrganizationCollectionCreateDialogProps,
  organizationCollectionCreateDialogStateCreate,
} from "./organizationCollectionCreateDialogStateCreate.js"

export function OrganizationCollectionCreateDialog(props: OrganizationCollectionCreateDialogProps): JSX.Element {
  const state = organizationCollectionCreateDialogStateCreate(props)

  return (
    <CorvuDialog
      title="Create Collection"
      description="Collections organize items and control member access in this organization."
      open={state.isOpen()}
      onOpenChange={(open) => {
        if (!open) state.onClose()
      }}
      innerClass="w-full max-w-lg"
    >
      <form onSubmit={state.handleSubmit} class="space-y-4">
        <Show when={state.errorMessage()}>
          {(msg) => (
            <div class="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 font-medium">
              {msg()}
            </div>
          )}
        </Show>

        <div>
          <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="create-col-name">
            Collection Name
          </label>
          <Input
            id="create-col-name"
            type="text"
            placeholder="e.g. Infrastructure & Keys"
            value={state.name()}
            onInput={state.handleNameInput}
            required
            class="mt-1 w-full"
          />
        </div>

        <div>
          <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="create-col-ext">
            External ID (Optional)
          </label>
          <Input
            id="create-col-ext"
            type="text"
            placeholder="e.g. COL-001"
            value={state.externalId()}
            onInput={state.handleExternalIdInput}
            class="mt-1 w-full"
          />
        </div>

        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <p class="font-semibold text-[11px] text-slate-700 uppercase tracking-wider dark:text-slate-300">
            Assign Members & Permissions:
          </p>
          <div class="mt-2.5 max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
            <For
              each={state.members()}
              fallback={<p class="text-xs text-slate-400 italic">No organization members found.</p>}
            >
              {(mem) => {
                const isIncluded = () => state.isMemberIncluded(mem.id)
                const access = () => state.memberAccess()[mem.id]
                return (
                  <div class="py-2">
                    <div class="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                      <Checkbox checked={isIncluded()} onChange={() => state.toggleMemberIncluded(mem.id)} />
                      <span>{mem.name || mem.email}</span>
                    </div>
                    <Show when={isIncluded()}>
                      <div class="ml-6 mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                        <div class="flex items-center gap-1.5">
                          <Checkbox
                            checked={access()?.readOnly ?? false}
                            onChange={(checked) => state.updateMemberPerm(mem.id, "readOnly", checked)}
                          />
                          <span>Read-Only</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <Checkbox
                            checked={access()?.hidePasswords ?? false}
                            onChange={(checked) => state.updateMemberPerm(mem.id, "hidePasswords", checked)}
                          />
                          <span>Hide Passwords</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <Checkbox
                            checked={access()?.manage ?? false}
                            onChange={(checked) => state.updateMemberPerm(mem.id, "manage", checked)}
                          />
                          <span>Manage</span>
                        </div>
                      </div>
                    </Show>
                  </div>
                )
              }}
            </For>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" type="button" onClick={state.onClose}>
            Cancel
          </Button>
          <Button variant="filled" size="sm" type="submit" disabled={state.isSubmitting()}>
            {state.isSubmitting() ? "Creating..." : "Create Collection"}
          </Button>
        </div>
      </form>
    </CorvuDialog>
  )
}
