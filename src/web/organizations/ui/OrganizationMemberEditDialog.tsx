import { For, type JSX, Show } from "solid-js"
import { CorvuDialog } from "#ui/interactive/dialog/CorvuDialog.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { organizationMemberRole } from "../schemas/organizationMemberRole.js"
import {
  type OrganizationMemberEditDialogProps,
  organizationMemberEditDialogStateCreate,
} from "./organizationMemberEditDialogStateCreate.js"

export function OrganizationMemberEditDialog(props: OrganizationMemberEditDialogProps): JSX.Element {
  const state = organizationMemberEditDialogStateCreate(props)

  return (
    <CorvuDialog
      title="Edit Member Role & Permissions"
      description={`Update access levels and collection assignments for ${state.member()?.name || state.member()?.email || "member"}.`}
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
          <label class="block font-medium text-slate-700 text-sm dark:text-slate-300" for="edit-member-role">
            Organization Role
          </label>
          <select
            id="edit-member-role"
            class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={state.role()}
            onChange={state.handleRoleChange}
          >
            <option value={organizationMemberRole.user}>User (can view & edit assigned collections)</option>
            <option value={organizationMemberRole.manager}>Manager (can manage collections & ciphers)</option>
            <option value={organizationMemberRole.admin}>Admin (full access to org settings & members)</option>
            <option value={organizationMemberRole.owner}>Owner (full administrative control)</option>
            <option value={organizationMemberRole.custom}>Custom</option>
          </select>
        </div>

        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="flex items-center gap-2">
            <Checkbox checked={state.accessAll()} onChange={state.handleAccessAllToggle} />
            <span class="font-medium text-sm text-slate-900 dark:text-slate-100">Grant access to all collections</span>
          </div>

          <Show when={!state.accessAll()}>
            <div class="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              <p class="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400">
                Collection Assignments:
              </p>
              <div class="max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                <For
                  each={state.collections()}
                  fallback={<p class="text-sm text-slate-400 italic">No collections available.</p>}
                >
                  {(col) => {
                    const isIncluded = () => state.isCollectionIncluded(col.id)
                    const access = () => state.collectionAccess()[col.id]
                    return (
                      <div class="py-2">
                        <div class="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                          <Checkbox checked={isIncluded()} onChange={() => state.toggleCollectionIncluded(col.id)} />
                          <span>{col.name}</span>
                        </div>
                        <Show when={isIncluded()}>
                          <div class="ml-6 mt-1.5 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                            <div class="flex items-center gap-1.5">
                              <Checkbox
                                checked={access()?.readOnly ?? false}
                                onChange={(checked) => state.updateCollectionPerm(col.id, "readOnly", checked)}
                              />
                              <span>Read-Only</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                              <Checkbox
                                checked={access()?.hidePasswords ?? false}
                                onChange={(checked) => state.updateCollectionPerm(col.id, "hidePasswords", checked)}
                              />
                              <span>Hide Passwords</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                              <Checkbox
                                checked={access()?.manage ?? false}
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
