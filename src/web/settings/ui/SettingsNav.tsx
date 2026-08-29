import { For, type JSX } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type SettingsNavStateCreateProps, settingsNavStateCreate } from "./settingsNavStateCreate.js"

export function SettingsNav(props: SettingsNavStateCreateProps): JSX.Element {
  const state = settingsNavStateCreate(props)

  return (
    <nav aria-label="Settings Navigation" class="flex flex-col gap-2">
      <div class="mb-2 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-full justify-start text-xs font-medium"
          onClick={state.handleBackToVault}
          aria-label="Back to Vault"
        >
          <Icon path={vaultSvgIcons.arrowLeft} class="mr-2 size-3.5" />
          Back to Vault
        </Button>
      </div>

      <div class="space-y-1">
        <For each={state.navItems}>
          {(item) => (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => state.handleSelectTab(item.id)}
              class={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                state.isTabActive(item.id)
                  ? "bg-blue-50 text-blue-700 shadow-xs dark:bg-blue-950/60 dark:text-blue-300"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
              }`}
            >
              <Icon
                path={item.icon}
                class={`size-4 shrink-0 ${
                  state.isTabActive(item.id) ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                }`}
              />
              <div class="min-w-0 flex-1">
                <div class="truncate font-semibold">{item.label}</div>
              </div>
            </Button>
          )}
        </For>
      </div>

      <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-full justify-start text-xs text-blue-600 dark:text-blue-400"
          onClick={state.handleNavigateToTwoFactor}
        >
          <Icon path={vaultSvgIcons.twoFactor} class="mr-2 size-3.5 text-blue-600 dark:text-blue-400" />
          Two-Step Login Setup
        </Button>
      </div>
    </nav>
  )
}
