import { type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { CheckSingle } from "#ui/input/check/CheckSingle.jsx"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { Separator } from "#ui/static/separator/Separator.jsx"
import { extensionPasskeyConsentStateCreate } from "./extensionPasskeyConsentStateCreate.js"

export interface ExtensionPasskeyConsentAppProps {
  options?: Parameters<typeof extensionPasskeyConsentStateCreate>[0]
  root?: "main" | "div"
}

export function ExtensionPasskeyConsentApp(props: ExtensionPasskeyConsentAppProps): JSX.Element {
  const state = extensionPasskeyConsentStateCreate(props.options)
  return (
    <Dynamic
      component={props.root ?? "main"}
      class="flex min-h-dvh flex-col gap-4 bg-slate-50 p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    >
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-lg font-semibold">Confirm passkey</h1>
        <Show when={state.model()}>{(model) => <Badge>{model().rpId}</Badge>}</Show>
      </header>
      <Separator />
      <Show when={state.busy() && state.model() === null}>
        <div role="status" aria-label="Loading passkey request" class="flex justify-center py-10">
          <LoaderShuffle4Dots />
        </div>
      </Show>
      <Show when={state.model()}>
        {(model) => (
          <>
            <p class="text-sm">
              {model().operation === "create" ? "Create a passkey for" : "Use a passkey for"}{" "}
              <strong>{model().rpName ?? model().rpId}</strong>.
            </p>
            <Show when={(model().verificationRequired && !model().verified) || model().locked}>
              <CardWrapper class="flex flex-col gap-3 border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <p class="text-sm">
                  {model().verificationRequired
                    ? "Enter your master password for fresh verification."
                    : "Unlock your vault to continue."}
                </p>
                <InputS
                  type="password"
                  autocomplete="current-password"
                  aria-label="Master password"
                  placeholder="Master password"
                  valueSignal={state.passwordSignal}
                />
                <Button
                  variant="filledBlue"
                  disabled={state.busy() || state.passwordSignal.get() === ""}
                  onClick={state.verify}
                >
                  Verify
                </Button>
              </CardWrapper>
            </Show>
            <Show when={model().verified || (!model().verificationRequired && !model().locked)}>
              <Show
                when={model().candidates.length > 0}
                fallback={<p class="text-sm">No matching login or passkey is available.</p>}
              >
                <CheckSingle
                  valueSignal={state.selectedKeySignal}
                  getOptions={() =>
                    model()
                      .candidates.filter((candidate) => !candidate.readOnly)
                      .map(state.candidateKey)
                  }
                  valueText={(key) => {
                    const candidate = model().candidates.find((value) => state.candidateKey(value) === key)
                    return candidate?.name ?? key
                  }}
                  valueTextSubtitle={(key) => {
                    const candidate = model().candidates.find((value) => state.candidateKey(value) === key)
                    if (candidate === undefined) return undefined
                    return `${candidate.userName ?? "No username"}${candidate.organization ? " · Organization" : ""}`
                  }}
                  variant="ghost"
                  class="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  optionClass="aria-pressed:bg-blue-100 aria-pressed:text-blue-950 hover:bg-slate-100 dark:aria-pressed:bg-blue-950 dark:aria-pressed:text-blue-100 dark:hover:bg-slate-800"
                  disallowDeselection
                />
                <Show when={model().candidates.some((candidate) => candidate.readOnly)}>
                  <p class="text-xs text-slate-600 dark:text-slate-300">
                    Read-only organization logins cannot be updated.
                  </p>
                </Show>
              </Show>
            </Show>
          </>
        )}
      </Show>
      <Show when={state.error()}>
        {(message) => (
          <p role="alert" class="text-sm text-red-600 dark:text-red-400">
            {message()}
          </p>
        )}
      </Show>
      <div class="mt-auto flex justify-end gap-2">
        <Button variant="outline" disabled={state.busy()} onClick={state.cancel}>
          Cancel
        </Button>
        <Button
          variant="filledBlue"
          disabled={state.busy() || state.selectedKeySignal.get() === ""}
          onClick={state.approve}
        >
          Confirm
        </Button>
      </div>
    </Dynamic>
  )
}
