import { For, type JSX, Show } from "solid-js"
import { CorvuDialog } from "#ui/interactive/dialog/CorvuDialog.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationCollectionEditDialogProps,
  organizationCollectionEditDialogStateCreate,
} from "./organizationCollectionEditDialogStateCreate.js"

export function OrganizationCollectionEditDialog(props: OrganizationCollectionEditDialogProps): JSX.Element {
  const state = organizationCollectionEditDialogStateCreate(props)

  return (
    <CorvuDialog
      title="Edit Collection"
      description={`Update settings and member permissions for ${state.collection()?.name || "collection"}.`}
      open={state.isOpen()}
      onOpenChange={(open) => {
        if (!open) state.onClose()
      }}
      innerClass="w-full max-w-lg"
    >
      <form onSubmit={state.handleSubmit} class="space-y-4">
        <Show when={state.errorMessage()}>
          {(msg) => (
            <div class="rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 font-medium">
              {msg()}
            </div>
          )}
        </Show>

        <div>
          <label class="block font-medium text-slate-700 text-sm dark:text-slate-300" for="edit-col-name">
            Collection Name
          </label>
          <Input
            id="edit-col-name"
            type="text"
            value={state.name()}
            onInput={state.handleNameInput}
            required
            class="mt-1 w-full"
          />
        </div>

        <div>
          <label class="block font-medium text-slate-700 text-sm dark:text-slate-300" for="edit-col-ext">
            External ID
          </label>
          <Input
            id="edit-col-ext"
            type="text"
            value={state.externalId()}
            onInput={state.handleExternalIdInput}
            class="mt-1 w-full"
          />
        </div>

        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <p class="font-semibold text-sm text-slate-700 uppercase tracking-wider dark:text-slate-300">
            Member Permissions:
          </p>
          <div class="mt-2.5 max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
            <For
              each={state.members()}
              fallback={<p class="text-sm text-slate-400 italic">No organization members available.</p>}
            >
              {(mem) => {
                const isIncluded = () => state.isMemberIncluded(mem.id)
                const access = () => state.memberAccess()[mem.id]
                return (
                  <div class="py-2">
                    <div class="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      <Checkbox checked={isIncluded()} onChange={() => state.toggleMemberIncluded(mem.id)} />
                      <span>{mem.name || mem.email}</span>
                    </div>
                    <Show when={isIncluded()}>
                      <div class="ml-6 mt-1.5 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
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
          <Button variant="outline" size="sm" class="h-8" type="button" onClick={state.onClose}>
            <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
            Cancel
          </Button>
          <Button variant="filled" size="sm" class="h-8" type="submit" disabled={state.isSubmitting()}>
            <Icon path={vaultSvgIcons.save} class="mr-1.5 size-3.5" />
            {state.isSubmitting() ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </CorvuDialog>
  )
}
