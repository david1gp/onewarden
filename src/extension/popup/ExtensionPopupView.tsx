import { mdiCog } from "@adaptive-ds/mdi/mdiCog.js"
import { mdiKey } from "@adaptive-ds/mdi/mdiKey.js"
import { mdiLock } from "@adaptive-ds/mdi/mdiLock.js"
import { mdiWeatherNight } from "@adaptive-ds/mdi/mdiWeatherNight.js"
import { mdiWhiteBalanceSunny } from "@adaptive-ds/mdi/mdiWhiteBalanceSunny.js"
import { For, type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import type { ExtensionGeneratorPreferences } from "../storage/extensionGeneratorPreferencesSchema.js"
import type { ExtensionPopupPaneStorage } from "../storage/extensionPopupPaneStorageSchema.js"
import { ExtensionBadge } from "../ui/ExtensionBadge.jsx"
import { ExtensionButtonIcon } from "../ui/ExtensionButtonIcon.jsx"
import { ExtensionInputS } from "../ui/ExtensionInputS.jsx"
import { ExtensionSeparator } from "../ui/ExtensionSeparator.jsx"
import { ExtensionSeparatorWithText } from "../ui/ExtensionSeparatorWithText.jsx"
import type { ExtensionPopupCommands } from "./ExtensionPopupCommands.js"
import { ExtensionPopupGeneratorPane } from "./ExtensionPopupGeneratorPane.jsx"
import { ExtensionPopupLoginCard } from "./ExtensionPopupLoginCard.jsx"
import type { ExtensionPopupViewModel } from "./ExtensionPopupViewModel.js"
import { extensionPopupViewStateCreate } from "./extensionPopupViewStateCreate.js"

export interface ExtensionPopupViewProps {
  model: ExtensionPopupViewModel
  commands: ExtensionPopupCommands
  root?: "main" | "div"
  navigationLabel?: string
  idPrefix?: string
  theme?: () => "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
  generatorOptions?: Parameters<typeof ExtensionPopupGeneratorPane>[0]["options"]
  generatorPreferences?: () => ExtensionGeneratorPreferences
  generatorPreferencesLoaded?: () => boolean
  onGeneratorPreferencesChange?: (preferences: ExtensionGeneratorPreferences) => void
  initialPane?: () => ExtensionPopupPaneStorage["pane"]
  initialPaneLoaded?: () => boolean
  onPaneChange?: (pane: ExtensionPopupPaneStorage["pane"]) => void
}

/** Browser-action popup showing the vault filtered to the active site. */
export function ExtensionPopupView(p: ExtensionPopupViewProps): JSX.Element {
  const state = extensionPopupViewStateCreate(
    () => p.model,
    () => p.commands,
    {
      theme: p.theme,
      onThemeChange: p.onThemeChange,
      initialPane: p.initialPane,
      initialPaneLoaded: p.initialPaneLoaded,
      onPaneChange: p.onPaneChange,
    },
  )

  return (
    <Dynamic
      component={p.root ?? "main"}
      class="extension-page-surface box-border flex w-90 max-w-full min-w-0 flex-col gap-3 p-3"
    >
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-sm font-semibold">OneWarden</h1>
        <div class="flex items-center gap-2">
          <ExtensionButtonIcon
            icon={state.theme() === "dark" ? mdiWeatherNight : mdiWhiteBalanceSunny}
            variant="ghost"
            size="sm"
            aria-label={`Switch to ${state.theme() === "dark" ? "light" : "dark"} theme`}
            onClick={state.themeToggle}
          />
          <ExtensionBadge role="group" aria-label="Active site">
            {state.siteLabel()}
          </ExtensionBadge>
        </div>
      </header>

      <ExtensionSeparator />

      <nav aria-label={p.navigationLabel ?? "Extension navigation"} class="flex min-w-0 items-center gap-2">
        <fieldset class="extension-subtle-surface m-0 grid min-w-0 grow grid-cols-2 items-center gap-1 rounded-xl border-0 p-1">
          <legend class="sr-only">Popup content</legend>
          <ExtensionButtonIcon
            variant="ghost"
            size="sm"
            icon={mdiLock}
            aria-current={state.isVaultPane() ? "page" : undefined}
            disabled={state.busy()}
            onClick={state.vaultPaneOpen}
            class="extension-selected-control min-h-10 min-w-0 px-2"
          >
            Vault
          </ExtensionButtonIcon>
          <ExtensionButtonIcon
            variant="ghost"
            size="sm"
            icon={mdiKey}
            aria-current={state.isGeneratorPane() ? "page" : undefined}
            disabled={state.busy()}
            onClick={state.generatorPaneOpen}
            class="extension-selected-control min-h-10 min-w-0 px-2"
          >
            Generator
          </ExtensionButtonIcon>
        </fieldset>
        <ExtensionButtonIcon
          variant="link"
          size="sm"
          icon={mdiCog}
          disabled={state.busy()}
          onClick={state.settingsOpen}
          title="Open Settings in a full window"
          class="extension-muted-text min-h-10 shrink-0 px-2"
        >
          Settings
        </ExtensionButtonIcon>
      </nav>

      <Show when={state.isGeneratorPane()}>
        <Show
          when={p.generatorPreferencesLoaded?.() ?? true}
          fallback={
            <div role="status" aria-label="Loading generator preferences" class="flex justify-center py-6">
              <LoaderShuffle4Dots />
            </div>
          }
        >
          <ExtensionPopupGeneratorPane
            idPrefix={p.idPrefix}
            options={
              p.generatorPreferences === undefined
                ? p.generatorOptions
                : {
                    ...p.generatorOptions,
                    initialPreferences: p.generatorPreferences(),
                    onPreferencesChange: p.onGeneratorPreferencesChange,
                  }
            }
          />
        </Show>
      </Show>

      <Show when={state.isVaultPane() && state.isLoading()}>
        <div role="status" aria-label="Loading vault" class="flex justify-center py-6">
          <LoaderShuffle4Dots />
        </div>
      </Show>

      <Show when={state.isVaultPane() && state.isLoggedOut()}>
        <section class="flex flex-col gap-2 py-4">
          <p class="text-sm">Sign in to use your vault on this site.</p>
          <Button
            variant="filledBlue"
            disabled={state.busy()}
            onClick={state.accountLogin}
            class="extension-primary-control"
          >
            Log in
          </Button>
          <Button variant="outline" disabled={state.busy()} onClick={state.accountRegister}>
            Create account
          </Button>
        </section>
      </Show>

      <Show when={state.isVaultPane() && state.isLocked()}>
        <section class="flex flex-col gap-2 py-4" aria-label="Unlock vault">
          <p class="text-sm">Your vault is locked.</p>
          <Show when={state.biometricAvailable() && state.biometricEnrolled()}>
            <Button
              variant="filledBlue"
              disabled={state.busy()}
              onClick={state.biometricUnlock}
              class="extension-primary-control"
            >
              Unlock with biometrics
            </Button>
            <ExtensionSeparatorWithText>
              <span class="extension-muted-text text-xs uppercase">or with password</span>
            </ExtensionSeparatorWithText>
          </Show>
          <ExtensionInputS
            type="password"
            aria-label="Master password"
            placeholder="Master password"
            autocomplete="current-password"
            disabled={state.busy()}
            valueSignal={state.masterPasswordSignal}
          />
          <Button
            variant={state.biometricAvailable() && state.biometricEnrolled() ? "outline" : "filledBlue"}
            disabled={state.busy()}
            onClick={state.vaultUnlock}
            class={state.biometricAvailable() && state.biometricEnrolled() ? undefined : "extension-primary-control"}
          >
            Unlock
          </Button>
          <Show when={state.errorMessage()}>
            {(message) => (
              <p role="alert" class="extension-error-text text-xs">
                {message()}
              </p>
            )}
          </Show>
        </section>
      </Show>

      <Show when={state.isVaultPane() && state.isError()}>
        <section role="alert" class="flex flex-col gap-2 py-4">
          <p class="extension-error-text text-sm">{state.errorMessage() ?? "Something went wrong."}</p>
          <Button variant="outline" disabled={state.busy()} onClick={state.vaultSync}>
            Retry
          </Button>
        </section>
      </Show>

      <Show when={state.isVaultPane() && state.isReady()}>
        <ExtensionInputS
          type="search"
          id={`${p.idPrefix ?? ""}popup-login-search`}
          aria-label="Search logins"
          placeholder="Search logins"
          autocomplete="off"
          disabled={state.busy()}
          valueSignal={state.searchQuerySignal}
        />

        <Show when={state.errorMessage()}>
          {(message) => (
            <p role="alert" class="extension-error-text text-xs">
              {message()}
            </p>
          )}
        </Show>

        <Show when={!state.isEmpty()}>
          <ul class="max-h-72 min-w-0 overflow-y-auto pr-1 flex list-none flex-col gap-2" aria-label="Saved logins">
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
          <p role="status" class="extension-muted-text py-4 text-center text-sm">
            {state.hasNoLogins() ? "No logins saved for this site." : "No logins match your search."}
          </p>
        </Show>
      </Show>

      <Show when={state.isVaultPane() || state.isGeneratorPane()}>
        <ExtensionSeparator />
      </Show>

      <Show when={state.isVaultPane()}>
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
          <Button variant="ghost" size="sm" disabled={state.busy()} onClick={state.fullVaultOpen} class="ml-auto">
            Open full vault
          </Button>
        </footer>
      </Show>
      <Show when={state.isGeneratorPane()}>
        <footer class="flex justify-end">
          <Button variant="ghost" size="sm" onClick={state.generatorOpen}>
            Open full generator
          </Button>
        </footer>
      </Show>
    </Dynamic>
  )
}
