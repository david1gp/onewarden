import { type JSX, Show } from "solid-js"
import { CorvuDialog } from "#ui/interactive/dialog/CorvuDialog.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import {
  type OrganizationDomainCreateDialogProps,
  organizationDomainCreateDialogStateCreate,
} from "./organizationDomainCreateDialogStateCreate.js"

export function OrganizationDomainCreateDialog(props: OrganizationDomainCreateDialogProps): JSX.Element {
  const state = organizationDomainCreateDialogStateCreate(props)

  return (
    <CorvuDialog
      title="Claim Organization Domain"
      description="Claim ownership of your corporate email domain to enable SSO and manage organization members."
      open={state.isOpen()}
      onOpenChange={(open) => {
        if (!open) state.onClose()
      }}
      innerClass="w-full max-w-md"
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
          <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="claim-domain-name">
            Domain Name
          </label>
          <Input
            id="claim-domain-name"
            type="text"
            placeholder="example.com"
            value={state.domainName()}
            onInput={state.handleDomainNameInput}
            required
            class="mt-1 w-full"
          />
          <p class="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            Do not include http:// or www. After claiming, you will be given a TXT record to add to your DNS
            configuration.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" type="button" onClick={state.onClose}>
            Cancel
          </Button>
          <Button variant="filled" size="sm" type="submit" disabled={state.isSubmitting()}>
            {state.isSubmitting() ? "Claiming..." : "Claim Domain"}
          </Button>
        </div>
      </form>
    </CorvuDialog>
  )
}
