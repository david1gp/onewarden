import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type EmergencyAccessTakeoverDialogProps,
  emergencyAccessTakeoverDialogStateCreate,
} from "./emergencyAccessTakeoverDialogStateCreate.js"

export function EmergencyAccessTakeoverDialog(props: EmergencyAccessTakeoverDialogProps): JSX.Element {
  const state = emergencyAccessTakeoverDialogStateCreate(props)

  return (
    <Show when={props.isOpen() && props.contact()}>
      {(contact) => (
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-takeover-dialog-title"
            class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <Icon path={vaultSvgIcons.key} class="size-5 text-red-600 dark:text-red-400" />
                <h2 id="emergency-takeover-dialog-title" class="font-bold text-base text-slate-900 dark:text-slate-100">
                  Account Takeover
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close Account Takeover dialog"
                onClick={state.handleClose}
                class="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              You are taking over the account of <strong>{contact().email}</strong>. Setting a new master password will
              allow you to log in as this user.
            </div>

            <Show when={state.errorMessage()}>
              {(msg) => (
                <div class="mt-3 rounded-lg bg-red-100 p-2.5 text-xs text-red-700 dark:bg-red-900/50 dark:text-red-200">
                  {msg()}
                </div>
              )}
            </Show>

            <form onSubmit={state.handleSubmit} class="mt-4 space-y-4 text-xs">
              <div>
                <label for="takeover-new-password" class="block font-medium text-slate-700 dark:text-slate-300">
                  New Master Password
                </label>
                <Input
                  id="takeover-new-password"
                  type="password"
                  value={state.newPassword()}
                  onInput={(e) => state.setNewPassword(e.currentTarget.value)}
                  placeholder="At least 8 characters"
                  required
                  class="mt-1 w-full"
                />
              </div>

              <div>
                <label for="takeover-confirm-password" class="block font-medium text-slate-700 dark:text-slate-300">
                  Confirm Master Password
                </label>
                <Input
                  id="takeover-confirm-password"
                  type="password"
                  value={state.confirmPassword()}
                  onInput={(e) => state.setConfirmPassword(e.currentTarget.value)}
                  placeholder="Repeat new password"
                  required
                  class="mt-1 w-full"
                />
              </div>

              <div class="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button type="button" variant="ghost" size="sm" onClick={state.handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="filled"
                  size="sm"
                  class="bg-red-600 hover:bg-red-700 text-white"
                  disabled={state.isSubmitting()}
                >
                  {state.isSubmitting() ? "Applying Takeover..." : "Complete Takeover"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Show>
  )
}
