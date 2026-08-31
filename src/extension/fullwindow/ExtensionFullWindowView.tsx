import { For, type JSX, Show } from "solid-js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { Separator } from "#ui/static/separator/Separator.jsx"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import { ExtensionFullWindowLoginDetail } from "./ExtensionFullWindowLoginDetail.jsx"
import { ExtensionFullWindowLoginRow } from "./ExtensionFullWindowLoginRow.jsx"
import { ExtensionFullWindowSettingsPane } from "./ExtensionFullWindowSettingsPane.jsx"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowViewStateCreate } from "./extensionFullWindowViewStateCreate.js"

export interface ExtensionFullWindowViewProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
}

/** Full-window vault with navigation, list, detail, and server settings panes. */
export function ExtensionFullWindowView(p: ExtensionFullWindowViewProps): JSX.Element {
  const state = extensionFullWindowViewStateCreate(p.model, () => p.commands)

  return (
    <main class="flex min-h-dvh flex-col gap-3 p-4 text-gray-900 md:p-6 dark:text-gray-100">
      <header class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-semibold">OneWarden Vault</h1>
        <Badge aria-label="Active site">{state.siteLabel()}</Badge>
      </header>

      <nav aria-label="Vault navigation" class="flex flex-wrap gap-1">
        <Button
          variant={state.isVaultPane() ? "filled" : "outline"}
          size="sm"
          aria-current={state.isVaultPane() ? "page" : undefined}
          onClick={state.vaultPaneOpen}
        >
          Vault
        </Button>
        <Button
          variant={state.isSettingsPane() ? "filled" : "outline"}
          size="sm"
          aria-current={state.isSettingsPane() ? "page" : undefined}
          onClick={state.settingsPaneOpen}
        >
          Settings
        </Button>
        <Button variant="outline" size="sm" disabled={state.busy() || !state.isReady()} onClick={state.loginAdd}>
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
      </nav>

      <Separator />

      <Show when={state.isSettingsPane()}>
        <ExtensionFullWindowSettingsPane
          disabled={state.busy()}
          environmentSaveStatus={state.environmentSaveStatus()}
          errorMessage={state.environmentSaveErrorMessage()}
          regionSignal={state.regionSignal}
          regionOptions={state.regionOptions}
          regionLabel={state.regionLabel}
          isSelfHosted={state.isSelfHosted()}
          fieldSignal={state.environmentFieldSignal}
          onSave={state.environmentSave}
        />
      </Show>

      <Show when={state.isVaultPane()}>
        <Show when={state.isLoading()}>
          <div role="status" aria-label="Loading vault" class="flex justify-center py-10">
            <LoaderShuffle4Dots />
          </div>
        </Show>

        <Show when={state.isLoggedOut()}>
          <section class="flex max-w-md flex-col gap-2 py-6">
            <p class="text-sm">Sign in to open your vault.</p>
            <InputS
              type="email"
              aria-label="Email address"
              placeholder="Email address"
              valueSignal={state.emailSignal}
            />
            <InputS
              type="password"
              aria-label="Master password"
              placeholder="Master password"
              valueSignal={state.masterPasswordSignal}
            />
            <Button variant="filled" disabled={state.busy()} onClick={state.accountLogin}>
              Log in
            </Button>
          </section>
        </Show>

        <Show when={state.isLocked()}>
          <section class="flex max-w-md flex-col gap-2 py-6">
            <p class="text-sm">Your vault is locked.</p>
            <InputS
              type="password"
              aria-label="Master password"
              placeholder="Master password"
              valueSignal={state.masterPasswordSignal}
            />
            <Button variant="filled" disabled={state.busy()} onClick={state.vaultUnlock}>
              Unlock
            </Button>
          </section>
        </Show>

        <Show when={state.isError()}>
          <section role="alert" class="flex max-w-md flex-col gap-2 py-6">
            <p class="text-sm text-red-600 dark:text-red-400">{state.errorMessage() ?? "Something went wrong."}</p>
            <Button variant="outline" disabled={state.busy()} onClick={state.vaultSync}>
              Retry
            </Button>
          </section>
        </Show>

        <Show when={state.isReady()}>
          <div class="flex flex-col gap-4 md:flex-row md:items-start">
            <section aria-label="Logins" class="flex min-w-0 flex-col gap-2 md:w-80 md:shrink-0">
              <InputS
                type="search"
                aria-label="Search logins"
                placeholder="Search logins"
                valueSignal={state.searchQuerySignal}
              />

              <Show when={state.siteFilterAvailable()}>
                <Button
                  variant={state.siteOnly() ? "filled" : "outline"}
                  size="sm"
                  aria-pressed={state.siteOnly() ? "true" : "false"}
                  onClick={state.siteOnlyToggle}
                >
                  Only this site
                </Button>
              </Show>

              <Show when={state.errorMessage()}>
                {(message) => (
                  <p role="alert" class="text-xs text-red-600 dark:text-red-400">
                    {message()}
                  </p>
                )}
              </Show>

              <Show
                when={!state.isEmpty()}
                fallback={
                  <p class="py-6 text-center text-sm text-gray-600 dark:text-gray-300">
                    {state.hasNoLogins() ? "Your vault is empty." : "No logins match your filters."}
                  </p>
                }
              >
                <ul class="flex list-none flex-col gap-1">
                  <For each={state.visibleLogins()}>
                    {(login) => (
                      <li>
                        <ExtensionFullWindowLoginRow
                          login={login}
                          selected={state.selectedLogin()?.id === login.id}
                          onSelect={state.loginSelect}
                        />
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </section>

            <section aria-label="Login details" class="min-w-0 grow">
              <Show
                when={state.selectedLogin()}
                fallback={
                  <p class="py-6 text-sm text-gray-600 dark:text-gray-300">Select a login to see its details.</p>
                }
              >
                {(login) => (
                  <ExtensionFullWindowLoginDetail
                    login={login()}
                    disabled={state.busy()}
                    fillAvailable={state.fillAvailable()}
                    fieldIsCopied={state.fieldIsCopied}
                    onFill={state.loginFill}
                    onCopy={state.fieldCopy}
                    totpIsCopied={state.totpIsCopied}
                    onTotpCopy={state.totpCopy}
                    onEdit={state.loginEdit}
                    onClose={state.loginDeselect}
                  />
                )}
              </Show>
            </section>
          </div>
        </Show>
      </Show>
    </main>
  )
}
