import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { AuthUnlockCard } from "../auth/ui/AuthUnlockCard.jsx"
import { demoLockedStateCreate } from "./demoLockedStateCreate.js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { vaultSvgIcons } from "./vaultSvgIcons.js"
import { VaultWorkspace } from "./VaultWorkspace.jsx"

export function DemoLocked(): JSX.Element {
  const state = demoLockedStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      <VaultDemoHeader currentDemo="locked" title="Locked Vault State" />

      <main id="main-content" tabindex="-1" class="flex flex-1 flex-col overflow-hidden focus:outline-none">
        <Show
          when={!state.isUnlocked()}
          fallback={
            <div class="flex flex-1 flex-col overflow-hidden">
              <div class="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <div class="flex items-center gap-2">
                  <Icon path={vaultSvgIcons.shieldCheck} class="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Vault Decrypted &amp; Unlocked (Presentation Preview)</span>
                </div>
                <Button variant="outline" size="sm" class="h-8 text-sm" onClick={() => state.lock()}>
                  <Icon path={vaultSvgIcons.lock} class="mr-1.5 size-3.5" />
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
            <AuthUnlockCard
              headingLevel="h2"
              onSubmit={state.unlock}
              onBiometricUnlock={() => state.unlock()}
              isSubmitting={state.isSubmitting}
              footerNote={() => (
                <span class="inline-flex items-center gap-1">
                  <Badge variant="subtle" class="text-sm px-1.5 py-0">
                    Presentation Only
                  </Badge>
                  Click either button to unlock demo state
                </span>
              )}
            />
          </div>
        </Show>
      </main>
    </div>
  )
}
