import { type JSX, Show } from "solid-js"
import { CorvuDialog } from "#ui/interactive/dialog/CorvuDialog.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import {
  type OrganizationCreateDialogProps,
  organizationCreateDialogStateCreate,
} from "./organizationCreateDialogStateCreate.js"

export function OrganizationCreateDialog(props: OrganizationCreateDialogProps): JSX.Element {
  const state = organizationCreateDialogStateCreate(props)

  return (
    <CorvuDialog
      title="New Organization"
      description="Create a secure workspace to share ciphers and collaborate with team members."
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
          <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="create-org-name">
            Organization Name
          </label>
          <Input
            id="create-org-name"
            type="text"
            placeholder="Acme Corp"
            value={state.name()}
            onInput={state.handleNameInput}
            required
            class="mt-1 w-full"
          />
        </div>

        <div>
          <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="create-org-email">
            Billing Email
          </label>
          <Input
            id="create-org-email"
            type="email"
            placeholder="billing@example.com"
            value={state.billingEmail()}
            onInput={state.handleBillingEmailInput}
            required
            class="mt-1 w-full"
          />
        </div>

        <div>
          <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="create-org-col-name">
            Initial Collection Name
          </label>
          <Input
            id="create-org-col-name"
            type="text"
            placeholder="Default Collection"
            value={state.collectionName()}
            onInput={state.handleCollectionNameInput}
            class="mt-1 w-full"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" type="button" onClick={state.onClose}>
            Cancel
          </Button>
          <Button variant="filled" size="sm" type="submit" disabled={state.isSubmitting()}>
            {state.isSubmitting() ? "Creating..." : "Create Organization"}
          </Button>
        </div>
      </form>
    </CorvuDialog>
  )
}
