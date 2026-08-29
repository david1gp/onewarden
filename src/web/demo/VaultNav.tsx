import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classesScrollbar } from "#ui/static/scrollbar/classesScrollbar.js"
import { type VaultNavStateProps, vaultNavStateCreate } from "./vaultNavStateCreate.js"
import { vaultSvgIcons } from "./vaultSvgIcons.js"

export function VaultNav(props: VaultNavStateProps): JSX.Element {
  const state = vaultNavStateCreate(props)

  return (
    <nav
      aria-label="Vault Navigation"
      class="flex h-full flex-col bg-slate-50 text-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
    >
      {/* Account / Workspace Switcher Header */}
      <div class="border-b border-slate-200 p-3 dark:border-slate-800">
        <CardWrapper class="flex items-center gap-2.5 rounded-lg border-0 bg-white p-2 shadow-xs ring-1 ring-slate-200/60 dark:border-0 dark:bg-slate-800 dark:ring-slate-700/60">
          <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-600 font-semibold text-xs text-white">
            AR
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-xs text-slate-900 dark:text-slate-100">Alex Rivera</p>
            <p class="truncate text-[11px] text-slate-600 dark:text-slate-400">Acme Corporation</p>
          </div>
          <Icon path={vaultSvgIcons.chevronDown} class="size-3.5 text-slate-400 dark:text-slate-500" />
        </CardWrapper>
      </div>

      {/* Navigation Scrollable Body */}
      <div class={`flex-1 space-y-5 overflow-y-auto ${classesScrollbar} p-3 text-xs`}>
        {/* Quick Access */}
        <div>
          <p class="px-2 pb-1 font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
            Navigation
          </p>
          <ul class="space-y-0.5">
            <li>
              <ButtonIcon
                variant="ghost"
                size="none"
                icon={vaultSvgIcons.allVaults}
                iconClass="size-4 text-blue-600 dark:text-blue-400 fill-current dark:fill-current"
                onClick={() => state.selectQuick("all")}
                class={`flex w-full items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                  state.selectedCategory() === "all" && state.selectedVault() === "all" && !state.selectedFolder()
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                <span class="flex-1 text-left">All Items</span>
                <span class="text-[11px] text-slate-600 dark:text-slate-400">{state.totalCount()}</span>
              </ButtonIcon>
            </li>
            <li>
              <ButtonIcon
                variant="ghost"
                size="none"
                icon={vaultSvgIcons.star}
                iconClass="size-4 text-amber-500 dark:text-amber-400 fill-current dark:fill-current"
                onClick={() => state.selectQuick("favorites")}
                class={`flex w-full items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                  state.selectedCategory() === "favorites" && !state.selectedFolder()
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                <span class="flex-1 text-left">Favorites</span>
                <span class="text-[11px] text-slate-600 dark:text-slate-400">{state.favoritesCount()}</span>
              </ButtonIcon>
            </li>
          </ul>
        </div>

        {/* Vaults */}
        <div>
          <p class="px-2 pb-1 font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
            Vaults
          </p>
          <ul class="space-y-0.5">
            <li>
              <ButtonIcon
                variant="ghost"
                size="none"
                icon={vaultSvgIcons.personalVault}
                iconClass="size-4 text-emerald-500 dark:text-emerald-400 fill-current dark:fill-current"
                onClick={() => state.selectVault("Personal")}
                class={`flex w-full items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                  (state.selectedVault() === "Personal" || state.selectedVault() === "personal") &&
                  state.selectedCategory() === "all" &&
                  !state.selectedFolder()
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                <span class="flex-1 text-left">My Vault</span>
                <span class="text-[11px] text-slate-600 dark:text-slate-400">{state.vaultCounts().personal}</span>
              </ButtonIcon>
            </li>
            <li>
              <ButtonIcon
                variant="ghost"
                size="none"
                icon={vaultSvgIcons.workVault}
                iconClass="size-4 text-indigo-500 dark:text-indigo-400 fill-current dark:fill-current"
                onClick={() => state.selectVault("Work")}
                class={`flex w-full items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                  (state.selectedVault() === "Work" || state.selectedVault() === "organization") &&
                  state.selectedCategory() === "all" &&
                  !state.selectedFolder()
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                <span class="flex-1 text-left">Acme Corporation</span>
                <span class="text-[11px] text-slate-600 dark:text-slate-400">{state.vaultCounts().organization}</span>
              </ButtonIcon>
            </li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <p class="px-2 pb-1 font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
            Categories
          </p>
          <ul class="space-y-0.5">
            <li>
              <ButtonIcon
                variant="ghost"
                size="none"
                icon={vaultSvgIcons.login}
                iconClass="size-4 text-blue-500 dark:text-blue-400 fill-current dark:fill-current"
                onClick={() => state.selectCategory("login")}
                class={`flex w-full items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                  state.selectedCategory() === "login" && !state.selectedFolder()
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                <span class="flex-1 text-left">Logins</span>
                <span class="text-[11px] text-slate-600 dark:text-slate-400">{state.categoryCounts().login}</span>
              </ButtonIcon>
            </li>
            <li>
              <ButtonIcon
                variant="ghost"
                size="none"
                icon={vaultSvgIcons.secureNote}
                iconClass="size-4 text-amber-500 dark:text-amber-400 fill-current dark:fill-current"
                onClick={() => state.selectCategory("secureNote")}
                class={`flex w-full items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                  state.selectedCategory() === "secureNote" && !state.selectedFolder()
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                <span class="flex-1 text-left">Secure Notes</span>
                <span class="text-[11px] text-slate-600 dark:text-slate-400">{state.categoryCounts().secureNote}</span>
              </ButtonIcon>
            </li>
            <li>
              <ButtonIcon
                variant="ghost"
                size="none"
                icon={vaultSvgIcons.creditCard}
                iconClass="size-4 text-emerald-500 dark:text-emerald-400 fill-current dark:fill-current"
                onClick={() => state.selectCategory("creditCard")}
                class={`flex w-full items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                  state.selectedCategory() === "creditCard" && !state.selectedFolder()
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                <span class="flex-1 text-left">Credit Cards</span>
                <span class="text-[11px] text-slate-600 dark:text-slate-400">{state.categoryCounts().creditCard}</span>
              </ButtonIcon>
            </li>
            <li>
              <ButtonIcon
                variant="ghost"
                size="none"
                icon={vaultSvgIcons.identity}
                iconClass="size-4 text-purple-500 dark:text-purple-400 fill-current dark:fill-current"
                onClick={() => state.selectCategory("identity")}
                class={`flex w-full items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                  state.selectedCategory() === "identity" && !state.selectedFolder()
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                <span class="flex-1 text-left">Identities</span>
                <span class="text-[11px] text-slate-600 dark:text-slate-400">{state.categoryCounts().identity}</span>
              </ButtonIcon>
            </li>
            <li>
              <ButtonIcon
                variant="ghost"
                size="none"
                icon={vaultSvgIcons.sshKey}
                iconClass="size-4 text-teal-500 dark:text-teal-400 fill-current dark:fill-current"
                onClick={() => state.selectCategory("sshKey")}
                class={`flex w-full items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                  state.selectedCategory() === "sshKey" && !state.selectedFolder()
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                <span class="flex-1 text-left">SSH Keys</span>
                <span class="text-[11px] text-slate-600 dark:text-slate-400">{state.categoryCounts().sshKey}</span>
              </ButtonIcon>
            </li>
          </ul>
        </div>

        {/* Folders */}
        <Show when={state.folders().length > 0}>
          <div>
            <p class="px-2 pb-1.5 font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
              Folders
            </p>
            <div class="flex flex-wrap gap-1 px-1">
              <For each={state.folders()}>
                {([folder, count]) => (
                  <Button
                    variant="ghost"
                    size="none"
                    onClick={() => state.selectFolder(folder)}
                    class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-[11px] transition-colors ${
                      state.selectedFolder() === folder
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200/80 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{folder}</span>
                    <span
                      class={state.selectedFolder() === folder ? "text-blue-100" : "text-slate-600 dark:text-slate-400"}
                    >
                      ({count})
                    </span>
                  </Button>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>

      {/* Footer / Lock Status */}
      <div class="border-t border-slate-200 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <div class="flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <Icon path={vaultSvgIcons.shieldCheck} class="size-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Vault Decrypted</span>
          </span>
          <Badge variant="subtle" class="text-[10px] py-0 px-1.5">
            Demo
          </Badge>
        </div>
      </div>
    </nav>
  )
}
