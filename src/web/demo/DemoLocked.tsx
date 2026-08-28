import { type JSX, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { demoLockedStateCreate } from "./demoLockedStateCreate.js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { vaultSvgIcons } from "./vaultSvgIcons.js"

export function DemoLocked(): JSX.Element {
  const state = demoLockedStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      <VaultDemoHeader currentDemo="locked" title="Locked Vault State" />

      <Show
        when={!state.isUnlocked()}
        fallback={
          <div class="flex flex-1 flex-col overflow-hidden">
            <div class="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div class="flex items-center gap-2">
                <Icon path={vaultSvgIcons.shieldCheck} class="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Vault Decrypted & Unlocked (Presentation Preview)</span>
              </div>
              <Button variant="outline" size="sm" class="text-xs" onClick={() => state.lock()}>
                Re-lock Vault
              </Button>
            </div>
            <div class="flex-1 overflow-hidden">
              <VaultWorkspace />
            </div>
          </div>
        }
      >
        <div class="flex flex-1 items-center justify-center p-4">
          <CardWrapper class="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div class="text-center">
              <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-950/30">
                <Icon path={vaultSvgIcons.lock} class="size-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 class="mt-4 font-bold text-xl text-slate-900 tracking-tight dark:text-slate-50">Vault is Locked</h2>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Enter your Master Password or use biometric passkey to unlock encrypted credentials.
              </p>
            </div>

            <form onSubmit={state.unlock} class="space-y-4">
              <div>
                <Label for="master-password" class="block text-xs text-slate-700 dark:text-slate-300">
                  Master Password
                </Label>
                <Input
                  id="master-password"
                  type="password"
                  placeholder="Enter master password (demo)"
                  value={state.masterPassword()}
                  onInput={(e) => state.setMasterPassword(e.currentTarget.value)}
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

                <ButtonIcon
                  type="button"
                  variant="outline"
                  class="w-full justify-center text-xs"
                  icon={vaultSvgIcons.shieldCheck}
                  iconClass="size-3.5 text-blue-600 dark:text-blue-400 fill-current dark:fill-current"
                  disabled={state.isSubmitting()}
                  onClick={() => state.unlock()}
                >
                  Unlock with Passkey / Biometrics
                </ButtonIcon>
              </div>
            </form>

            <div class="border-t border-slate-100 pt-3 text-center text-[11px] text-slate-400 dark:border-slate-800">
              <span class="inline-flex items-center gap-1">
                <Badge variant="subtle" class="text-[10px] px-1.5 py-0">
                  Presentation Only
                </Badge>
                Click either button to unlock demo state
              </span>
            </div>
          </CardWrapper>
        </div>
      </Show>
    </div>
  )
}
