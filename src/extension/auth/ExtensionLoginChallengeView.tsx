import { For, type JSX, Match, Show, Switch } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { fieldIconPathGet } from "../../shared/field/fieldIconPathGet.js"
import type { ExtensionFullWindowCommands } from "../fullwindow/ExtensionFullWindowCommands.js"
import { ExtensionCardWrapper } from "../ui/ExtensionCardWrapper.jsx"
import { ExtensionCheckbox } from "../ui/ExtensionCheckbox.jsx"
import { ExtensionInputS } from "../ui/ExtensionInputS.jsx"
import type { ExtensionLoginChallenge } from "./extensionLoginChallengeSchema.js"
import { extensionLoginChallengeViewStateCreate } from "./extensionLoginChallengeViewStateCreate.js"
import { extensionLoginTwoFactorProvider } from "./extensionLoginTwoFactorProvider.js"

export function ExtensionLoginChallengeView(p: {
  challenge: () => ExtensionLoginChallenge
  commands: ExtensionFullWindowCommands
  busy: () => boolean
  errorMessage: () => string | null
  statusMessage: () => string | null
  idPrefix?: string
}): JSX.Element {
  const state = extensionLoginChallengeViewStateCreate({
    challenge: p.challenge,
    commands: () => p.commands,
    busy: p.busy,
  })
  return (
    <ExtensionCardWrapper class="flex w-full max-w-md flex-col gap-4 p-5">
      <div>
        <h2 class="font-semibold text-lg">Two-step verification</h2>
        <p class="extension-muted-text text-sm">Choose an available method to continue.</p>
      </div>
      <Show when={p.errorMessage()}>
        {(message) => (
          <p role="alert" class="extension-error-text text-sm">
            {message()}
          </p>
        )}
      </Show>
      <Show when={p.statusMessage()}>
        {(message) => (
          <p role="status" class="extension-info-text text-sm">
            {message()}
          </p>
        )}
      </Show>
      <fieldset class="flex flex-col gap-1">
        <legend class="font-medium text-sm">Verification method</legend>
        <div class="grid w-full grid-cols-2 gap-2">
          <For each={state.providerKeys()}>
            {(provider) => (
              <label class="relative min-w-0">
                <input
                  type="radio"
                  name={`${p.idPrefix ?? ""}login-challenge-method`}
                  value={provider}
                  checked={state.providerSelectSignal.get() === provider}
                  disabled={p.busy()}
                  class="peer sr-only"
                  onChange={() => state.providerSelectSignal.set(provider)}
                />
                <span
                  class="extension-selected-control flex min-h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-2 py-2 text-center text-sm font-medium peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-ring)] peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                  aria-current={state.providerSelectSignal.get() === provider ? "true" : undefined}
                >
                  <Icon path={fieldIconPathGet(state.providerLabel(provider))} class="size-5" />
                  <span class="min-w-0 leading-tight">{state.providerLabel(provider)}</span>
                </span>
              </label>
            )}
          </For>
        </div>
      </fieldset>
      <form class="flex flex-col gap-4" onSubmit={state.submit}>
        <Switch>
          <Match when={state.selectedProvider() === extensionLoginTwoFactorProvider.authenticator}>
            <ExtensionInputS
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              aria-label="Authenticator code"
              placeholder="123456"
              disabled={p.busy()}
              valueSignal={state.tokenInputSignal}
            />
          </Match>
          <Match when={state.selectedProvider() === extensionLoginTwoFactorProvider.email}>
            <div class="flex flex-col gap-2">
              <p class="text-sm">
                {p.challenge().emailHint === null
                  ? "Send a code to your account email."
                  : `Send a code to ${p.challenge().emailHint}.`}
              </p>
              <Button type="button" variant="outline" disabled={p.busy()} onClick={state.emailSend}>
                Send email code
              </Button>
              <ExtensionInputS
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                aria-label="Email verification code"
                placeholder="Verification code"
                disabled={p.busy()}
                valueSignal={state.tokenInputSignal}
              />
            </div>
          </Match>
          <Match when={state.selectedProvider() === extensionLoginTwoFactorProvider.webauthn}>
            <div class="flex flex-col gap-2">
              <Button type="button" variant="outline" disabled={p.busy()} onClick={state.webAuthnPrompt}>
                Use security key or passkey
              </Button>
              <Show when={state.webAuthnStatus()}>
                {(message) => (
                  <p role="status" class="text-sm">
                    {message()}
                  </p>
                )}
              </Show>
            </div>
          </Match>
          <Match when={state.selectedProvider() === extensionLoginTwoFactorProvider.recoveryCode}>
            <ExtensionInputS
              type="text"
              autocomplete="one-time-code"
              aria-label="Recovery code"
              placeholder="Recovery code"
              disabled={p.busy()}
              valueSignal={state.tokenInputSignal}
            />
          </Match>
        </Switch>
        <ExtensionCheckbox
          id={`${p.idPrefix ?? ""}login-challenge-remember`}
          checked={state.rememberDevice()}
          disabled={p.busy()}
          onChange={state.rememberDeviceSet}
        >
          <span class="text-sm">Remember this device</span>
        </ExtensionCheckbox>
        <div class="grid w-full grid-cols-2 gap-2">
          <Button type="submit" variant="filledBlue" class="extension-primary-control w-full" disabled={p.busy()}>
            {p.errorMessage() === null ? "Verify" : "Retry verification"}
          </Button>
          <Button type="button" variant="outline" class="w-full" disabled={p.busy()} onClick={state.cancel}>
            Cancel
          </Button>
        </div>
      </form>
    </ExtensionCardWrapper>
  )
}
