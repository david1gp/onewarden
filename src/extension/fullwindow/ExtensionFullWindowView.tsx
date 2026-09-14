import { mdiAccountPlus } from "@adaptive-ds/mdi/mdiAccountPlus.js"
import { mdiCog } from "@adaptive-ds/mdi/mdiCog.js"
import { mdiKey } from "@adaptive-ds/mdi/mdiKey.js"
import { mdiLock } from "@adaptive-ds/mdi/mdiLock.js"
import { mdiLogout } from "@adaptive-ds/mdi/mdiLogout.js"
import { mdiSync } from "@adaptive-ds/mdi/mdiSync.js"
import { mdiWeatherNight } from "@adaptive-ds/mdi/mdiWeatherNight.js"
import { mdiWhiteBalanceSunny } from "@adaptive-ds/mdi/mdiWhiteBalanceSunny.js"
import { type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import type { VaultSort } from "../../shared/vault/vaultSortSchema.js"
import type { CipherPresentationAdapter } from "../../web/ciphers/ui/cipherPresentationAdapter.js"
import { VaultShell } from "../../web/vault/ui/VaultShell.jsx"
import { ExtensionAccountAuthView } from "../auth/ExtensionAccountAuthView.jsx"
import { ExtensionLoginChallengeView } from "../auth/ExtensionLoginChallengeView.jsx"
import type { ExtensionGeneratorPreferences } from "../storage/extensionGeneratorPreferencesSchema.js"
import { ExtensionBadge } from "../ui/ExtensionBadge.jsx"
import { ExtensionButtonIcon } from "../ui/ExtensionButtonIcon.jsx"
import { ExtensionInputS } from "../ui/ExtensionInputS.jsx"
import { ExtensionSeparatorWithText } from "../ui/ExtensionSeparatorWithText.jsx"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import { ExtensionFullWindowGeneratorPane } from "./ExtensionFullWindowGeneratorPane.jsx"
import type { ExtensionFullWindowInitialState } from "./ExtensionFullWindowInitialState.js"
import { ExtensionFullWindowSettingsPane } from "./ExtensionFullWindowSettingsPane.jsx"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowViewStateCreate } from "./extensionFullWindowViewStateCreate.js"

export interface ExtensionFullWindowViewProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  initialState?: ExtensionFullWindowInitialState
  generatorOptions?: Parameters<typeof ExtensionFullWindowGeneratorPane>[0]["options"]
  generatorPreferences?: () => ExtensionGeneratorPreferences
  generatorPreferencesLoaded?: () => boolean
  onGeneratorPreferencesChange?: (preferences: ExtensionGeneratorPreferences) => void
  vaultSort?: () => VaultSort
  vaultSortLoaded?: () => boolean
  onVaultSortChange?: (sort: VaultSort) => void
  theme?: () => "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
  cipherAdapter?: CipherPresentationAdapter
  idPrefix?: string
  root?: "main" | "div"
  navigationLabel?: string
}

/** Full-window vault with navigation, list, detail, and server settings panes. */
export function ExtensionFullWindowView(p: ExtensionFullWindowViewProps): JSX.Element {
  const state = extensionFullWindowViewStateCreate(p.model, () => p.commands, p.initialState, {
    vaultSort: p.vaultSort,
    onVaultSortChange: p.onVaultSortChange,
    theme: p.theme,
    onThemeChange: p.onThemeChange,
    cipherAdapter: p.cipherAdapter,
  })

  return (
    <Dynamic
      component={p.root ?? "main"}
      class="extension-page-surface mx-auto flex min-h-dvh w-full max-w-screen-2xl flex-col gap-4 p-2"
    >
      <header class="extension-subtle-surface flex flex-wrap items-center gap-2 rounded-2xl p-2 shadow-sm sm:gap-3">
        <div class="flex min-w-0 items-center gap-2 px-1 sm:mr-1">
          <h1 class="truncate text-base font-semibold sm:text-lg">OneWarden Vault</h1>
        </div>

        <nav
          aria-label={p.navigationLabel ?? "Extension navigation"}
          class="extension-full-window-navigation-tabs order-3 grid w-full grid-cols-3 items-center gap-1 sm:order-none sm:w-auto sm:flex"
        >
          <ExtensionButtonIcon
            variant="ghost"
            icon={mdiLock}
            aria-current={state.isVaultPane() ? "page" : undefined}
            onClick={state.vaultPaneOpen}
            class="extension-selected-control min-h-9 min-w-0 px-2"
          >
            Vault
          </ExtensionButtonIcon>
          <ExtensionButtonIcon
            variant="ghost"
            icon={mdiKey}
            aria-current={state.isGeneratorPane() ? "page" : undefined}
            onClick={state.generatorPaneOpen}
            class="extension-selected-control min-h-9 min-w-0 px-2"
          >
            Generator
          </ExtensionButtonIcon>
          <ExtensionButtonIcon
            variant="ghost"
            icon={mdiCog}
            aria-current={state.isSettingsPane() ? "page" : undefined}
            onClick={state.settingsPaneOpen}
            class="extension-selected-control min-h-9 min-w-0 px-2"
          >
            Settings
          </ExtensionButtonIcon>
        </nav>

        <div class="ml-auto flex flex-wrap items-center justify-end gap-1">
          <ExtensionBadge role="group" aria-label="Active site" class="max-w-40 truncate sm:max-w-56">
            {state.siteLabel()}
          </ExtensionBadge>
          <ExtensionButtonIcon
            icon={state.theme() === "dark" ? mdiWeatherNight : mdiWhiteBalanceSunny}
            variant="ghost"
            aria-label={`Switch to ${state.theme() === "dark" ? "light" : "dark"} theme`}
            onClick={state.themeToggle}
          />
          <Show when={state.isLoggedOut()}>
            <Button
              variant="ghost"
              aria-current={state.isAuthPane() ? "page" : undefined}
              onClick={state.authPaneOpen}
              class="extension-selected-control min-h-10"
            >
              Create account
            </Button>
          </Show>
          <Show when={state.isVaultPane()}>
            <span aria-hidden="true" class="extension-boundary mx-1 hidden h-6 border-l sm:block" />
            <Show when={state.isLoginCategory()}>
              <ExtensionButtonIcon
                variant="ghost"
                icon={mdiAccountPlus}
                disabled={state.busy() || !state.isReady()}
                onClick={state.loginAdd}
              >
                Add login
              </ExtensionButtonIcon>
            </Show>
            <ExtensionButtonIcon variant="ghost" icon={mdiSync} disabled={state.busy()} onClick={state.vaultSync}>
              Sync
            </ExtensionButtonIcon>
            <Show when={state.isReady()}>
              <ExtensionButtonIcon variant="ghost" icon={mdiLock} disabled={state.busy()} onClick={state.vaultLock}>
                Lock
              </ExtensionButtonIcon>
            </Show>
            <Show when={!state.isLoggedOut()}>
              <ExtensionButtonIcon variant="ghost" icon={mdiLogout} disabled={state.busy()} onClick={state.vaultLogout}>
                Log out
              </ExtensionButtonIcon>
            </Show>
          </Show>
        </div>
      </header>

      <Show when={state.isAuthPane() && state.isLoggedOut()}>
        <ExtensionAccountAuthView
          commands={p.commands}
          environment={() => p.model().environment}
          onLogin={state.accountLoginOpen}
          onSettings={state.settingsPaneOpen}
          idPrefix={p.idPrefix}
        />
      </Show>

      <Show when={state.isAuthPane() && !state.isLoggedOut()}>
        <section role="status" class="flex max-w-md flex-col gap-2 py-6">
          <p class="text-sm">Account setup is available after logging out.</p>
          <Button variant="filledBlue" class="extension-primary-control" onClick={state.vaultPaneOpen}>
            Return to vault
          </Button>
        </section>
      </Show>

      <Show when={state.isSettingsPane()}>
        <ExtensionFullWindowSettingsPane
          idPrefix={p.idPrefix}
          disabled={state.busy()}
          environmentSaveStatus={state.environmentSaveStatus()}
          errorMessage={state.environmentSaveErrorMessage()}
          regionSignal={state.regionSignal}
          regionOptions={state.regionOptions}
          regionLabel={state.regionLabel}
          isSelfHosted={state.isSelfHosted()}
          fieldSignal={state.environmentFieldSignal}
          onSave={state.environmentSave}
          securityAvailable={state.securitySettingsAvailable()}
          securityLoading={state.securitySettingsLoading()}
          securitySaveStatus={state.securitySaveStatus()}
          securityErrorMessage={state.securityErrorMessage()}
          securityTimeoutSignal={state.securityTimeoutSignal}
          securityTimeoutOptions={state.securityTimeoutOptions}
          securityTimeoutLabel={state.securityTimeoutLabel}
          securityActionSignal={state.securityActionSignal}
          securityActionOptions={state.securityActionOptions}
          securityActionLabel={state.securityActionLabel}
          securityNeverSelected={state.securityNeverSelected()}
          onSecuritySave={state.lockPolicySave}
          autofillPageLoadSignal={state.autofillPageLoadSignal}
          autofillOptions={state.autofillOptions}
          autofillLabel={state.autofillLabel}
          autofillSiteAvailable={state.siteFilterAvailable()}
          autofillSiteLabel={state.siteLabel()}
          autofillSiteDisabled={state.autofillSiteDisabled()}
          autofillSaveStatus={state.autofillSaveStatus()}
          onAutofillSiteToggle={state.autofillSiteToggle}
          onAutofillSave={state.autofillPolicySave}
          biometricCapability={state.biometricCapability()}
          biometricEnrolled={state.biometricEnrolled()}
          biometricSaveStatus={state.biometricSaveStatus()}
          biometricErrorMessage={state.biometricErrorMessage()}
          onBiometricEnroll={state.biometricEnroll}
          onBiometricRevoke={state.biometricRevoke}
        />
      </Show>

      <Show when={state.isGeneratorPane()}>
        <Show
          when={p.generatorPreferencesLoaded?.() ?? true}
          fallback={
            <div role="status" aria-label="Loading generator preferences" class="flex justify-center py-10">
              <LoaderShuffle4Dots />
            </div>
          }
        >
          <ExtensionFullWindowGeneratorPane
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

      <Show when={state.isVaultPane()}>
        <Show when={state.isLoading()}>
          <div role="status" aria-label="Loading vault" class="flex justify-center py-10">
            <LoaderShuffle4Dots />
          </div>
        </Show>

        <Show when={state.isLoggedOut()}>
          <Show
            when={state.authChallenge()}
            fallback={
              <section class="flex max-w-md flex-col gap-2 py-6">
                <p class="text-sm">Sign in to open your vault.</p>
                <ExtensionInputS
                  type="email"
                  aria-label="Email address"
                  placeholder="Email address"
                  disabled={state.busy()}
                  valueSignal={state.emailSignal}
                />
                <ExtensionInputS
                  type="password"
                  aria-label="Master password"
                  placeholder="Master password"
                  disabled={state.busy()}
                  valueSignal={state.masterPasswordSignal}
                />
                <Button
                  variant="filledBlue"
                  class="extension-primary-control"
                  disabled={state.busy()}
                  onClick={state.accountLogin}
                >
                  Log in
                </Button>
              </section>
            }
          >
            {(challenge) => (
              <ExtensionLoginChallengeView
                challenge={challenge}
                commands={p.commands}
                busy={state.busy}
                errorMessage={state.errorMessage}
                statusMessage={state.authMessage}
                idPrefix={p.idPrefix}
              />
            )}
          </Show>
        </Show>

        <Show when={state.isLocked()}>
          <Show
            when={state.authChallenge()}
            fallback={
              <section class="flex max-w-md flex-col gap-3 py-6" aria-label="Unlock vault">
                <p class="text-sm">Your vault is locked.</p>
                <Show when={state.biometricAvailable() && state.biometricEnrolled()}>
                  <Button
                    variant="filledBlue"
                    class="extension-primary-control"
                    disabled={state.busy()}
                    onClick={state.biometricUnlock}
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
                  disabled={state.busy()}
                  valueSignal={state.masterPasswordSignal}
                />
                <Button
                  variant={state.biometricAvailable() && state.biometricEnrolled() ? "outline" : "filledBlue"}
                  class={
                    state.biometricAvailable() && state.biometricEnrolled() ? undefined : "extension-primary-control"
                  }
                  disabled={state.busy()}
                  onClick={state.vaultUnlock}
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
            }
          >
            {(challenge) => (
              <ExtensionLoginChallengeView
                challenge={challenge}
                commands={p.commands}
                busy={state.busy}
                errorMessage={state.errorMessage}
                statusMessage={state.authMessage}
                idPrefix={p.idPrefix}
              />
            )}
          </Show>
        </Show>

        <Show when={state.isError()}>
          <section role="alert" class="flex max-w-md flex-col gap-2 py-6">
            <p class="extension-error-text text-sm">{state.errorMessage() ?? "Something went wrong."}</p>
            <Button variant="outline" disabled={state.busy()} onClick={state.vaultSync}>
              Retry
            </Button>
          </section>
        </Show>

        <Show when={state.isReady()}>
          <VaultShell
            workspace={state.sharedVaultState.workspace}
            state={{
              items: state.sharedVaultState.items,
              folders: state.sharedVaultState.folders,
              collections: state.sharedVaultState.collections,
              profile: state.sharedVaultState.workspace.profile,
              isLoading: state.sharedVaultState.isLoading,
              errorMessage: state.sharedVaultState.errorMessage,
            }}
            actions={{
              syncVault: state.sharedVaultState.syncVault,
              onOpenSettings: state.settingsPaneOpen,
              onLock: state.vaultLock,
              onLogout: state.vaultLogout,
            }}
          />
        </Show>
      </Show>
    </Dynamic>
  )
}
