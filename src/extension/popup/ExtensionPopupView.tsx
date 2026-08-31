import { mdiCog } from "@adaptive-ds/mdi/mdiCog.js"
import { mdiKey } from "@adaptive-ds/mdi/mdiKey.js"
import { mdiLock } from "@adaptive-ds/mdi/mdiLock.js"
import { For, type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { Separator } from "#ui/static/separator/Separator.jsx"
import type { ExtensionPopupCommands } from "./ExtensionPopupCommands.js"
import { ExtensionPopupLoginCard } from "./ExtensionPopupLoginCard.jsx"
import type { ExtensionPopupViewModel } from "./ExtensionPopupViewModel.js"
import { extensionPopupViewStateCreate } from "./extensionPopupViewStateCreate.js"

export interface ExtensionPopupViewProps {
  model: ExtensionPopupViewModel
  commands: ExtensionPopupCommands
  root?: "main" | "div"
  navigationLabel?: string
}

/** Browser-action popup showing the vault filtered to the active site. */
export function ExtensionPopupView(p: ExtensionPopupViewProps): JSX.Element {
  const state = extensionPopupViewStateCreate(
    () => p.model,
    () => p.commands,
  )

  return (
    <Dynamic
      component={p.root ?? "main"}
      class="flex w-90 flex-col gap-3 bg-slate-50 p-3 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    >
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-sm font-semibold">OneWarden</h1>
        <Badge role="group" aria-label="Active site">
          {state.siteLabel()}
        </Badge>
      </header>

      <Separator />

      <nav
        aria-label={p.navigationLabel ?? "Extension navigation"}
        class="flex items-center gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-900"
      >
        <ButtonIcon
          variant="filledBlue"
          size="sm"
          icon={mdiLock}
          aria-current="page"
          disabled={state.busy()}
          onClick={state.fullVaultOpen}
          class="min-h-10 flex-1 px-2"
        >
          Vault
        </ButtonIcon>
        <ButtonIcon
          variant="ghost"
          size="sm"
          icon={mdiKey}
          disabled={state.busy()}
          onClick={state.generatorOpen}
          class="min-h-10 flex-1 px-2"
        >
          Generator
        </ButtonIcon>
        <ButtonIcon
          variant="ghost"
          size="sm"
          icon={mdiCog}
          disabled={state.busy()}
          onClick={state.settingsOpen}
          class="min-h-10 flex-1 px-2"
        >
          Settings
        </ButtonIcon>
      </nav>

      <Show when={state.isLoading()}>
        <div role="status" aria-label="Loading vault" class="flex justify-center py-6">
          <LoaderShuffle4Dots />
        </div>
      </Show>

      <Show when={state.isLoggedOut()}>
        <section class="flex flex-col gap-2 py-4">
          <p class="text-sm">Sign in to use your vault on this site.</p>
          <Button variant="filledBlue" disabled={state.busy()} onClick={state.accountLogin}>
            Log in
          </Button>
        </section>
      </Show>

      <Show when={state.isLocked()}>
        <section class="flex flex-col gap-2 py-4">
          <p class="text-sm">Your vault is locked.</p>
          <InputS
            type="password"
            aria-label="Master password"
            placeholder="Master password"
            valueSignal={state.masterPasswordSignal}
          />
          <Button variant="filledBlue" disabled={state.busy()} onClick={state.vaultUnlock}>
            Unlock
          </Button>
        </section>
      </Show>

      <Show when={state.isError()}>
        <section role="alert" class="flex flex-col gap-2 py-4">
          <p class="text-sm text-red-600 dark:text-red-400">{state.errorMessage() ?? "Something went wrong."}</p>
          <Button variant="outline" disabled={state.busy()} onClick={state.vaultSync}>
            Retry
          </Button>
        </section>
      </Show>

      <Show when={state.isReady()}>
        <InputS
          type="search"
          aria-label="Search logins"
          placeholder="Search logins"
          valueSignal={state.searchQuerySignal}
        />

        <Show when={state.errorMessage()}>
          {(message) => (
            <p role="alert" class="text-xs text-red-600 dark:text-red-400">
              {message()}
            </p>
          )}
        </Show>

        <Show when={!state.isEmpty()}>
          <ul class="flex list-none flex-col gap-2">
            <For each={state.visibleLogins()}>
              {(login) => (
                <li>
                  <ExtensionPopupLoginCard
                    login={login}
                    disabled={state.busy()}
                    fillAvailable={state.fillAvailable()}
                    fieldIsCopied={state.fieldIsCopied}
                    onFill={state.loginFill}
                    onCopy={state.fieldCopy}
                    totpIsCopied={state.totpIsCopied}
                    onTotpCopy={state.totpCopy}
                  />
                </li>
              )}
            </For>
          </ul>
        </Show>

        <Show when={state.isEmpty()}>
          <p class="py-4 text-center text-sm text-slate-600 dark:text-slate-300">
            {state.hasNoLogins() ? "No logins saved for this site." : "No logins match your search."}
          </p>
        </Show>
      </Show>

      <Separator />

      <footer class="flex flex-wrap gap-1">
        <Button variant="outline" size="sm" disabled={state.busy()} onClick={state.loginAdd}>
          Add login
        </Button>
        <Button variant="outline" size="sm" disabled={state.busy()} onClick={state.vaultSync}>
          Sync
        </Button>
        <Show when={state.isReady()}>
          <Button variant="outline" size="sm" disabled={state.busy()} onClick={state.vaultLock}>
            Lock
          </Button>
        </Show>
        <Show when={!state.isLoggedOut()}>
          <Button variant="outline" size="sm" disabled={state.busy()} onClick={state.vaultLogout}>
            Log out
          </Button>
        </Show>
      </footer>
    </Dynamic>
  )
}
