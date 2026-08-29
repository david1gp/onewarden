import { type JSX, Show } from "solid-js"
import { CorvuDialog } from "#ui/interactive/dialog/CorvuDialog.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import {
  type OrganizationPolicyEditDialogProps,
  organizationPolicyEditDialogStateCreate,
} from "./organizationPolicyEditDialogStateCreate.js"

export function OrganizationPolicyEditDialog(props: OrganizationPolicyEditDialogProps): JSX.Element {
  const state = organizationPolicyEditDialogStateCreate(props)

  return (
    <CorvuDialog
      title={state.policyName()}
      description={state.policyDescription()}
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

        {/* Enabled Toggle */}
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-bold text-slate-900 text-sm dark:text-slate-100">Policy Status</span>
              <p class="text-slate-500 text-xs dark:text-slate-400">
                {state.enabled()
                  ? "This policy is enforced for organization members."
                  : "This policy is currently inactive."}
              </p>
            </div>
            <Checkbox checked={state.enabled()} onChange={state.handleEnabledToggle} />
          </div>
        </div>

        {/* Master Password Requirements Settings (Type 1) */}
        <Show when={state.policy()?.type === 1}>
          <div class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <p class="font-semibold text-xs text-slate-800 dark:text-slate-200">Password Complexity Options</p>
            <div>
              <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="policy-min-length">
                Minimum Password Length
              </label>
              <Input
                id="policy-min-length"
                type="number"
                min="8"
                max="128"
                value={state.minLength()}
                onInput={state.handleMinLengthChange}
                class="mt-1 w-full"
              />
            </div>
            <div class="grid grid-cols-2 gap-2.5 pt-1 text-xs">
              <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Checkbox checked={state.requireUpper()} onChange={state.setRequireUpper} />
                <span>Uppercase letters</span>
              </div>
              <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Checkbox checked={state.requireLower()} onChange={state.setRequireLower} />
                <span>Lowercase letters</span>
              </div>
              <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Checkbox checked={state.requireNumber()} onChange={state.setRequireNumber} />
                <span>Numbers (0-9)</span>
              </div>
              <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Checkbox checked={state.requireSpecial()} onChange={state.setRequireSpecial} />
                <span>Special characters</span>
              </div>
            </div>
          </div>
        </Show>

        {/* Password Generator Settings (Type 2) */}
        <Show when={state.policy()?.type === 2}>
          <div class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <p class="font-semibold text-xs text-slate-800 dark:text-slate-200">Default Generator Configuration</p>
            <div>
              <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="policy-gen-length">
                Default Generated Password Length
              </label>
              <Input
                id="policy-gen-length"
                type="number"
                min="8"
                max="128"
                value={state.defaultGenLength()}
                onInput={state.handleDefaultGenLengthChange}
                class="mt-1 w-full"
              />
            </div>
          </div>
        </Show>

        {/* Send Options Settings (Type 7) */}
        <Show when={state.policy()?.type === 7}>
          <div class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <p class="font-semibold text-xs text-slate-800 dark:text-slate-200">Send Expiration Policy</p>
            <div>
              <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="policy-send-exp">
                Maximum Expiration (Days)
              </label>
              <Input
                id="policy-send-exp"
                type="number"
                min="1"
                max="365"
                value={state.maxExpirationDays()}
                onInput={state.handleMaxExpirationDaysChange}
                class="mt-1 w-full"
              />
            </div>
          </div>
        </Show>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" type="button" onClick={state.onClose}>
            Cancel
          </Button>
          <Button variant="filled" size="sm" type="submit" disabled={state.isSubmitting()}>
            {state.isSubmitting() ? "Saving..." : "Save Policy"}
          </Button>
        </div>
      </form>
    </CorvuDialog>
  )
}
