import { createEffect, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type SendEditDialogProps, sendEditDialogStateCreate } from "./sendEditDialogStateCreate.js"

export function SendEditDialog(props: SendEditDialogProps): JSX.Element {
  const state = sendEditDialogStateCreate(props)

  createEffect(() => {
    if (props.isOpen()) {
      state.syncFromSend(props.send())
    }
  })

  return (
    <Show when={props.isOpen() && props.send()}>
      {(send) => (
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-edit-dialog-title"
            class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <Icon path={vaultSvgIcons.send} class="size-5 text-blue-600 dark:text-blue-400" />
                <h2 id="send-edit-dialog-title" class="font-bold text-base text-slate-900 dark:text-slate-100">
                  Edit Send
                </h2>
              </div>
              <ButtonIconOnly
                type="button"
                variant="ghost"
                size="none"
                title="Close Edit Send dialog"
                aria-label="Close Edit Send dialog"
                icon={vaultSvgIcons.close}
                iconClass="size-4"
                onClick={state.handleClose}
                class="size-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              />
            </div>

            <form onSubmit={state.handleSubmit} class="mt-4 space-y-4 text-sm">
              <div>
                <label for="edit-send-name" class="block font-medium text-slate-700 dark:text-slate-300">
                  Name
                </label>
                <Input
                  id="edit-send-name"
                  type="text"
                  value={state.name()}
                  onInput={(e) => state.setName(e.currentTarget.value)}
                  required
                  class="mt-1 w-full"
                />
              </div>

              <div>
                <label for="edit-send-notes" class="block font-medium text-slate-700 dark:text-slate-300">
                  Private Notes
                </label>
                <Input
                  id="edit-send-notes"
                  type="text"
                  value={state.notes()}
                  onInput={(e) => state.setNotes(e.currentTarget.value)}
                  class="mt-1 w-full"
                />
              </div>

              <div>
                <label for="edit-send-recipient-emails" class="block font-medium text-slate-700 dark:text-slate-300">
                  Recipient Verification Emails
                </label>
                <Input
                  id="edit-send-recipient-emails"
                  type="text"
                  value={state.emails()}
                  onInput={(e) => state.setEmails(e.currentTarget.value)}
                  placeholder="person@example.com, another@example.com"
                  aria-describedby="edit-send-recipient-emails-help"
                  class="mt-1 w-full"
                />
                <p id="edit-send-recipient-emails-help" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Leave blank to disable recipient verification.
                </p>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label for="edit-send-password" class="block font-medium text-slate-700 dark:text-slate-300">
                    Change Password
                  </label>
                  <Input
                    id="edit-send-password"
                    type="password"
                    value={state.password()}
                    onInput={(e) => state.setPassword(e.currentTarget.value)}
                    placeholder="New password (leave blank to keep)"
                    disabled={state.emails().trim().length > 0}
                    class="mt-1 w-full"
                  />
                  <Show when={state.emails().trim().length > 0}>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Recipient verification replaces password protection.
                    </p>
                  </Show>
                  <Show when={send().authType === 1}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={state.handleRemovePassword}
                      disabled={state.isRemovingPassword()}
                      class="mt-1 h-8 text-sm text-red-600 hover:underline dark:text-red-400"
                    >
                      <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                      {state.isRemovingPassword() ? "Removing..." : "Remove current password"}
                    </Button>
                  </Show>
                </div>

                <div>
                  <label for="edit-send-max-count" class="block font-medium text-slate-700 dark:text-slate-300">
                    Max Access Count
                  </label>
                  <Input
                    id="edit-send-max-count"
                    type="number"
                    min="1"
                    value={state.maxAccessCount()}
                    onInput={(e) => state.setMaxAccessCount(e.currentTarget.value)}
                    placeholder="Unlimited"
                    class="mt-1 w-full"
                  />
                </div>
              </div>

              <div class="space-y-2 pt-2">
                <Checkbox
                  id="editHideEmail"
                  checked={state.hideEmail()}
                  onChange={(checked) => state.setHideEmail(checked)}
                  class="text-sm text-slate-700 dark:text-slate-300"
                >
                  Hide my email address from recipients
                </Checkbox>

                <div class="flex items-center gap-2">
                  <Checkbox
                    id="editDisabled"
                    checked={state.disabled()}
                    onChange={(checked) => state.setDisabled(checked)}
                  />
                  <label for="editDisabled" class="text-sm text-slate-700 dark:text-slate-300">
                    Disable this Send (prevent access)
                  </label>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button type="button" variant="ghost" size="sm" class="h-8" onClick={state.handleClose}>
                  <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                  Cancel
                </Button>
                <Button type="submit" variant="filled" size="sm" class="h-8" disabled={state.isSubmitting()}>
                  <Icon path={vaultSvgIcons.save} class="mr-1.5 size-3.5" />
                  {state.isSubmitting() ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Show>
  )
}
