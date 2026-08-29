import { type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AuthUnlockCardProps, authUnlockCardStateCreate } from "./authUnlockCardStateCreate.js"

export function AuthUnlockCard(props: AuthUnlockCardProps): JSX.Element {
  const state = authUnlockCardStateCreate(props)

  return (
    <CardWrapper
      class={classMerge(
        "w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900",
        props.class,
      )}
    >
      <div class="text-center">
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-950/30">
          <Icon path={vaultSvgIcons.lock} class="size-7 text-blue-600 dark:text-blue-400" />
        </div>
        <Dynamic
          component={state.headingLevel()}
          class="mt-4 font-bold text-xl text-slate-900 tracking-tight dark:text-slate-50"
        >
          Vault is Locked
        </Dynamic>
        <Show
          when={state.email()}
          fallback={
            <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Enter your Master Password or use biometric passkey to unlock encrypted credentials.
            </p>
          }
        >
          {(email) => (
            <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Logged in as <span class="font-medium text-slate-700 dark:text-slate-200">{email()}</span>. Enter your
              Master Password to unlock.
            </p>
          )}
        </Show>
      </div>

      <Show when={state.errorMessage()}>
        {(msg) => (
          <div
            role="alert"
            class="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {msg()}
          </div>
        )}
      </Show>

      <form onSubmit={state.handleSubmit} class="space-y-4">
        <div>
          <Label for="master-password" class="block text-xs text-slate-700 dark:text-slate-300">
            Master Password
          </Label>
          <Input
            id="master-password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter master password"
            value={state.masterPassword()}
            onInput={(e) => state.setMasterPassword(e.currentTarget.value)}
            required
            class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <div class="flex flex-col gap-2 pt-1">
          <Button
            type="submit"
            variant="filledBlue"
            class="w-full justify-center text-xs font-semibold"
            disabled={state.isSubmitting()}
          >
            <Show when={state.isSubmitting()} fallback="Unlock Vault">
              Decrypting Vault...
            </Show>
          </Button>

          <Show when={state.hasBiometricUnlock()}>
            <ButtonIcon
              type="button"
              variant="outline"
              class="w-full justify-center text-xs"
              icon={vaultSvgIcons.shieldCheck}
              iconClass="size-3.5 text-blue-600 dark:text-blue-400 fill-current dark:fill-current"
              disabled={state.isSubmitting()}
              onClick={state.handleBiometricUnlock}
            >
              Unlock with Passkey / Biometrics
            </ButtonIcon>
          </Show>

          <Show when={state.hasLogout()}>
            <Button
              type="button"
              variant="outline"
              class="w-full justify-center text-xs text-slate-600 dark:text-slate-400"
              disabled={state.isSubmitting()}
              onClick={state.handleLogout}
            >
              Log Out of Account
            </Button>
          </Show>
        </div>
      </form>

      <Show when={state.footerNote()}>
        <div class="border-t border-slate-100 pt-3 text-center text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {state.footerNote()}
        </div>
      </Show>
    </CardWrapper>
  )
}
