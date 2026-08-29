import { createEffect, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type EmergencyAccessEditDialogProps,
  emergencyAccessEditDialogStateCreate,
} from "./emergencyAccessEditDialogStateCreate.js"

export function EmergencyAccessEditDialog(props: EmergencyAccessEditDialogProps): JSX.Element {
  const state = emergencyAccessEditDialogStateCreate(props)

  createEffect(() => {
    if (props.isOpen()) {
      state.syncFromContact(props.contact())
    }
  })

  return (
    <Show when={props.isOpen() && props.contact()}>
      {(contact) => (
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-edit-dialog-title"
            class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <Icon path={vaultSvgIcons.lifebuoy} class="size-5 text-blue-600 dark:text-blue-400" />
                <h2 id="emergency-edit-dialog-title" class="font-bold text-base text-slate-900 dark:text-slate-100">
                  Edit Emergency Contact
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close Edit Emergency Contact dialog"
                onClick={state.handleClose}
                class="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={state.handleSubmit} class="mt-4 space-y-4 text-xs">
              <div>
                <span class="block font-medium text-slate-700 dark:text-slate-300">Contact</span>
                <p class="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {contact().name ? `${contact().name} (${contact().email})` : contact().email}
                </p>
              </div>

              <div>
                <span class="block font-medium text-slate-700 dark:text-slate-300">Access Level</span>
                <div class="mt-1 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => state.setAccessType(0)}
                    class={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                      state.accessType() === 0
                        ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    View (Read Only)
                  </button>
                  <button
                    type="button"
                    onClick={() => state.setAccessType(1)}
                    class={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                      state.accessType() === 1
                        ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    Takeover (Full Account)
                  </button>
                </div>
              </div>

              <div>
                <label for="edit-contact-wait-time" class="block font-medium text-slate-700 dark:text-slate-300">
                  Wait Time Before Access Granted
                </label>
                <select
                  id="edit-contact-wait-time"
                  value={String(state.waitTimeDays())}
                  onChange={(e) => state.setWaitTimeDays(Number(e.currentTarget.value))}
                  class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="0">Immediately (0 Days)</option>
                  <option value="1">1 Day</option>
                  <option value="2">2 Days</option>
                  <option value="3">3 Days</option>
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                </select>
              </div>

              <div class="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button type="button" variant="ghost" size="sm" onClick={state.handleClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="filled" size="sm" disabled={state.isSubmitting()}>
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
