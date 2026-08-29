import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type AccountEmailChangeCardProps,
  accountEmailChangeCardStateCreate,
} from "./accountEmailChangeCardStateCreate.js"

export function AccountEmailChangeCard(props: AccountEmailChangeCardProps): JSX.Element {
  const state = accountEmailChangeCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div class="flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
          <Icon path={vaultSvgIcons.email} class="size-5" />
        </div>
        <div>
          <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">Change Account Email</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Update the email address associated with your OneWarden account
          </p>
        </div>
      </div>

      <div class="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
        Current Email: <span class="font-semibold text-slate-900 dark:text-slate-100">{state.currentEmail()}</span>
      </div>

      <Show when={state.step() === 1}>
        <form onSubmit={state.handleRequestToken} class="mt-6 max-w-md space-y-4">
          <div>
            <Label for="change-new-email" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              New Email Address
            </Label>
            <div class="mt-1">
              <Input
                id="change-new-email"
                type="email"
                placeholder="new.email@example.com"
                value={state.newEmailInput()}
                onInput={(e) => state.setNewEmailInput(e.currentTarget.value)}
                class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <Label for="change-email-pwd" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Current Master Password
            </Label>
            <div class="mt-1">
              <Input
                id="change-email-pwd"
                type="password"
                placeholder="Enter master password"
                value={state.masterPasswordInput()}
                onInput={(e) => state.setMasterPasswordInput(e.currentTarget.value)}
                class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div class="pt-2">
            <Button type="submit" variant="filled" size="sm" class="h-9 text-xs" disabled={state.isRequestingToken()}>
              {state.isRequestingToken() ? "Sending Code..." : "Send Verification Code"}
            </Button>
          </div>
        </form>
      </Show>

      <Show when={state.step() === 2}>
        <form onSubmit={state.handleCompleteChange} class="mt-6 max-w-md space-y-4">
          <div class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            A verification code has been sent to <strong>{state.newEmailInput()}</strong>. Please enter it below along
            with your master password to complete the change.
          </div>

          <div>
            <Label for="change-email-token" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Verification Code / Token
            </Label>
            <div class="mt-1">
              <Input
                id="change-email-token"
                type="text"
                placeholder="Enter token from email"
                value={state.tokenInput()}
                onInput={(e) => state.setTokenInput(e.currentTarget.value)}
                class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <Label for="change-email-pwd-confirm" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Confirm Master Password
            </Label>
            <div class="mt-1">
              <Input
                id="change-email-pwd-confirm"
                type="password"
                placeholder="Enter master password"
                value={state.masterPasswordInput()}
                onInput={(e) => state.setMasterPasswordInput(e.currentTarget.value)}
                class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div class="pt-2 flex items-center gap-3">
            <Button type="submit" variant="filled" size="sm" class="h-9 text-xs" disabled={state.isCompletingChange()}>
              {state.isCompletingChange() ? "Completing..." : "Confirm & Update Email"}
            </Button>
            <Button type="button" variant="ghost" size="sm" class="h-9 text-xs" onClick={state.handleReset}>
              Back
            </Button>
          </div>
        </form>
      </Show>
    </CardWrapper>
  )
}
