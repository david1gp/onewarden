import { For, type JSX, Show } from "solid-js"
import { CorvuDialog } from "#ui/interactive/dialog/CorvuDialog.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import {
  type OrganizationGroupCreateDialogProps,
  organizationGroupCreateDialogStateCreate,
} from "./organizationGroupCreateDialogStateCreate.js"

export function OrganizationGroupCreateDialog(props: OrganizationGroupCreateDialogProps): JSX.Element {
  const state = organizationGroupCreateDialogStateCreate(props)

  return (
    <CorvuDialog
      title="Create Group"
      description="Groups allow you to organize users and manage collection access at scale."
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
          <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="create-grp-name">
            Group Name
          </label>
          <Input
            id="create-grp-name"
            type="text"
            placeholder="e.g. Engineering Team"
            value={state.name()}
            onInput={state.handleNameInput}
            required
            class="mt-1 w-full"
          />
        </div>

        <div>
          <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="create-grp-ext">
            External ID (Optional)
          </label>
          <Input
            id="create-grp-ext"
            type="text"
            placeholder="e.g. GRP-ENG-001"
            value={state.externalId()}
            onInput={state.handleExternalIdInput}
            class="mt-1 w-full"
          />
        </div>

        {/* Access All Collections Option */}
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="flex items-start gap-2.5">
            <Checkbox checked={state.accessAll()} onChange={state.handleAccessAllToggle} />
            <div>
              <span class="font-medium text-xs text-slate-900 dark:text-slate-100">
                Grant Access to All Collections
              </span>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Members in this group will automatically gain read/write access to all existing and future collections.
              </p>
            </div>
          </div>
        </div>

        {/* Collection Permissions (when not accessAll) */}
        <Show when={!state.accessAll()}>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
            <p class="font-semibold text-[11px] text-slate-700 uppercase tracking-wider dark:text-slate-300">
              Assign Collections & Permissions:
            </p>
            <div class="mt-2.5 max-h-40 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
              <For
                each={state.collections()}
                fallback={<p class="text-xs text-slate-400 italic">No organization collections found.</p>}
              >
                {(col) => {
                  const isIncluded = () => state.isCollectionIncluded(col.id)
                  const perms = () => state.collectionPermissions()[col.id]
                  return (
                    <div class="py-2">
                      <div class="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                        <Checkbox checked={isIncluded()} onChange={() => state.toggleCollectionIncluded(col.id)} />
                        <span>{col.name}</span>
                      </div>
                      <Show when={isIncluded()}>
                        <div class="ml-6 mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                          <div class="flex items-center gap-1.5">
                            <Checkbox
                              checked={perms()?.readOnly ?? false}
                              onChange={(checked) => state.updateCollectionPerm(col.id, "readOnly", checked)}
                            />
                            <span>Read-Only</span>
                          </div>
                          <div class="flex items-center gap-1.5">
                            <Checkbox
                              checked={perms()?.hidePasswords ?? false}
                              onChange={(checked) => state.updateCollectionPerm(col.id, "hidePasswords", checked)}
                            />
                            <span>Hide Passwords</span>
                          </div>
                          <div class="flex items-center gap-1.5">
                            <Checkbox
                              checked={perms()?.manage ?? false}
                              onChange={(checked) => state.updateCollectionPerm(col.id, "manage", checked)}
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
        </Show>

        {/* Member Assignments */}
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <p class="font-semibold text-[11px] text-slate-700 uppercase tracking-wider dark:text-slate-300">
            Add Members to Group:
          </p>
          <div class="mt-2.5 max-h-36 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
            <For
              each={state.members()}
              fallback={<p class="text-xs text-slate-400 italic">No organization members found.</p>}
            >
              {(mem) => {
                const isSelected = () => state.isMemberSelected(mem.id)
                return (
                  <div class="flex items-center justify-between py-2 text-xs">
                    <div class="flex items-center gap-2">
                      <Checkbox checked={isSelected()} onChange={() => state.toggleMemberSelected(mem.id)} />
                      <span class="font-medium text-slate-800 dark:text-slate-200">{mem.name || mem.email}</span>
                    </div>
                    <span class="text-[11px] text-slate-400">{mem.email}</span>
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
            {state.isSubmitting() ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </form>
    </CorvuDialog>
  )
}
