import { type JSX, Show } from "solid-js"
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
}

export function ExtensionPasskeyConsentApp(props: ExtensionPasskeyConsentAppProps): JSX.Element {
  const state = extensionPasskeyConsentStateCreate(props.options)
  return (
    <main class="flex min-h-dvh flex-col gap-4 p-5 text-gray-900 dark:text-gray-100">
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
              <CardWrapper class="flex flex-col gap-3">
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
                  variant="filled"
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
                  disallowDeselection
                />
                <Show when={model().candidates.some((candidate) => candidate.readOnly)}>
                  <p class="text-xs text-gray-600 dark:text-gray-300">
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
          variant="filled"
          disabled={state.busy() || state.selectedKeySignal.get() === ""}
          onClick={state.approve}
        >
          Confirm
        </Button>
      </div>
    </main>
  )
}
