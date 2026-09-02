import { Show } from "solid-js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { SwitchSingle } from "#ui/input/switch/SwitchSingle.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { SignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import type { ExtensionFullWindowSecuritySaveStatus } from "./ExtensionFullWindowSecuritySaveStatus.js"

type ExtensionFullWindowSettingsField = "webVault" | "api" | "identity" | "icons" | "notifications" | "events"

export interface ExtensionFullWindowSettingsPaneProps {
  idPrefix?: string
  disabled: boolean
  environmentSaveStatus: ExtensionFullWindowEnvironmentSaveStatus
  errorMessage: string | null
  regionSignal: SignalObject<string>
  regionOptions: () => string[]
  regionLabel: (region: string) => string
  isSelfHosted: boolean
  fieldSignal: (field: ExtensionFullWindowSettingsField | "base") => SignalObject<string>
  onSave: () => void
  securityAvailable: boolean
  securityLoading: boolean
  securitySaveStatus: ExtensionFullWindowSecuritySaveStatus
  securityErrorMessage: string | null
  securityTimeoutSignal: SignalObject<string>
  securityTimeoutOptions: () => string[]
  securityTimeoutLabel: (value: string) => string
  securityActionSignal: SignalObject<string>
  securityActionOptions: () => string[]
  securityActionLabel: (value: string) => string
  securityNeverSelected: boolean
  onSecuritySave: () => void
  autofillPageLoadSignal: SignalObject<string>
  autofillOptions: () => string[]
  autofillLabel: (value: string) => string
  autofillSiteAvailable: boolean
  autofillSiteLabel: string
  autofillSiteDisabled: boolean
  autofillSaveStatus: ExtensionFullWindowSecuritySaveStatus
  onAutofillSiteToggle: () => void
  onAutofillSave: () => void
  biometricCapability?: "available" | "unavailable" | "unsupported"
  biometricEnrolled?: boolean
  biometricSaveStatus?: ExtensionFullWindowSecuritySaveStatus
  biometricErrorMessage?: string | null
  onBiometricEnroll?: () => void
  onBiometricRevoke?: () => void
}

/** Security and server controls for the full-window settings pane. */
export function ExtensionFullWindowSettingsPane(p: ExtensionFullWindowSettingsPaneProps) {
  return (
    <div class="flex max-w-2xl flex-col gap-4">
      <CardWrapper
        class="flex flex-col gap-4 border-blue-200 bg-white p-5 dark:border-blue-900 dark:bg-slate-900"
        aria-label="Autofill settings"
      >
        <div>
          <p class="text-xs font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-300">Autofill</p>
          <h2 class="text-lg font-semibold">Autofill on page load</h2>
          <p class="text-sm text-slate-600 dark:text-slate-300">
            Off by default. When enabled, only one unambiguous login match is filled. Cards and identities are never
            filled automatically.
          </p>
        </div>
        <SwitchSingle
          id={`${p.idPrefix ?? ""}extension-autofill-page-load`}
          disabled={p.disabled}
          valueSignal={p.autofillPageLoadSignal}
          getOptions={p.autofillOptions}
          valueText={p.autofillLabel}
          class="w-fit p-1"
        />
        <Show when={p.autofillSiteAvailable}>
          <div class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <span class="text-sm">
              {p.autofillSiteLabel}: {p.autofillSiteDisabled ? "disabled" : "allowed"}
            </span>
            <Button variant="ghost" disabled={p.disabled} onClick={p.onAutofillSiteToggle}>
              {p.autofillSiteDisabled ? "Allow on this site" : "Disable on this site"}
            </Button>
          </div>
        </Show>
        <Show when={p.autofillSaveStatus === "saved"}>
          <p role="status" class="text-sm text-green-700 dark:text-green-400">
            Autofill settings saved.
          </p>
        </Show>
        <Show when={p.autofillSaveStatus === "error"}>
          <p role="alert" class="text-sm text-red-600 dark:text-red-400">
            Autofill settings could not be saved.
          </p>
        </Show>
        <div>
          <Button variant="filledBlue" disabled={p.disabled} onClick={p.onAutofillSave}>
            {p.autofillSaveStatus === "saving" ? "Saving autofill settings…" : "Save autofill settings"}
          </Button>
        </div>
      </CardWrapper>
      <CardWrapper
        class="flex flex-col gap-5 overflow-hidden border-blue-200 bg-white p-5 dark:border-blue-900 dark:bg-slate-900"
        aria-label="Security settings"
      >
        <div class="flex flex-col gap-1">
          <p class="text-xs font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-300">Security</p>
          <h2 class="text-lg font-semibold">Vault timeout</h2>
          <p class="max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Choose when an inactive unlocked vault should be secured and what happens afterward.
          </p>
        </div>

        <Show
          when={p.securityAvailable}
          fallback={
            <Show
              when={p.securityLoading}
              fallback={
                <p role="alert" class="text-sm text-red-600 dark:text-red-400">
                  {p.securityErrorMessage ?? "Security settings could not be loaded."}
                </p>
              }
            >
              <p role="status" class="text-sm text-slate-600 dark:text-slate-300">
                Loading security settings…
              </p>
            </Show>
          }
        >
          <div class="grid gap-5 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <Label for={`${p.idPrefix ?? ""}extension-vault-timeout`}>Vault timeout</Label>
              <SelectSingleNative
                id={`${p.idPrefix ?? ""}extension-vault-timeout`}
                disabled={p.disabled}
                valueSignal={p.securityTimeoutSignal}
                getOptions={p.securityTimeoutOptions}
                valueText={p.securityTimeoutLabel}
              />
              <p class="text-xs text-slate-600 dark:text-slate-300">Measured from when the vault was unlocked.</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label for={`${p.idPrefix ?? ""}extension-vault-timeout-action`}>Vault timeout action</Label>
              <SwitchSingle
                id={`${p.idPrefix ?? ""}extension-vault-timeout-action`}
                disabled={p.disabled}
                valueSignal={p.securityActionSignal}
                getOptions={p.securityActionOptions}
                valueText={p.securityActionLabel}
                class="w-fit p-1"
              />
              <p class="text-xs text-slate-600 dark:text-slate-300">
                Lock keeps your signed-in session. Log out removes it and requires a full sign-in.
              </p>
            </div>
          </div>

          <Show when={p.securityNeverSelected}>
            <p class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              With Never selected, your vault stays unlocked until you lock it, log out, or close the browser session.
            </p>
          </Show>

          <Show when={p.securitySaveStatus === "saved"}>
            <p role="status" class="text-sm text-green-700 dark:text-green-400">
              Security settings saved.
            </p>
          </Show>

          <Show when={p.securitySaveStatus === "error"}>
            <p role="alert" class="text-sm text-red-600 dark:text-red-400">
              {p.securityErrorMessage ?? "Security settings could not be saved."}
            </p>
          </Show>

          <div>
            <Button variant="filledBlue" disabled={p.disabled} onClick={p.onSecuritySave}>
              {p.securitySaveStatus === "saving" ? "Saving security settings…" : "Save security settings"}
            </Button>
          </div>
        </Show>
      </CardWrapper>

      <CardWrapper
        class="flex flex-col gap-4 border-blue-200 bg-white p-5 dark:border-blue-900 dark:bg-slate-900"
        aria-label="Biometric settings"
      >
        <div class="flex flex-col gap-1">
          <p class="text-xs font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-300">Biometrics</p>
          <h2 class="text-lg font-semibold">Unlock with biometrics</h2>
          <p class="max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Use your device's biometric authenticator (such as fingerprint, Windows Hello, or Touch ID) to unlock your
            vault.
          </p>
        </div>

        <Show
          when={p.biometricCapability === "available"}
          fallback={
            <p class="text-sm text-slate-600 dark:text-slate-300">
              {p.biometricCapability === "unavailable"
                ? "Biometric authentication is unavailable on this device."
                : "Biometric unlock is not supported by your browser or platform."}
            </p>
          }
        >
          <div class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <span class="text-sm">Biometric unlock is {p.biometricEnrolled ? "enabled" : "disabled"}</span>
            <Button
              variant={p.biometricEnrolled ? "outline" : "filledBlue"}
              disabled={p.disabled || p.biometricSaveStatus === "saving"}
              onClick={p.biometricEnrolled ? p.onBiometricRevoke : p.onBiometricEnroll}
            >
              {p.biometricEnrolled ? "Disable biometric unlock" : "Enable biometric unlock"}
            </Button>
          </div>

          <Show when={p.biometricSaveStatus === "saved"}>
            <p role="status" class="text-sm text-green-700 dark:text-green-400">
              Biometric settings saved.
            </p>
          </Show>

          <Show when={p.biometricSaveStatus === "error"}>
            <p role="alert" class="text-sm text-red-600 dark:text-red-400">
              {p.biometricErrorMessage ?? "Biometric operation failed."}
            </p>
          </Show>
        </Show>
      </CardWrapper>

      <CardWrapper
        class="flex flex-col gap-3 border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        aria-label="Server settings"
      >
        <h2 class="text-base font-semibold">Server settings</h2>

        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}extension-region`}>Region</Label>
          <SelectSingleNative
            id={`${p.idPrefix ?? ""}extension-region`}
            disabled={p.disabled}
            valueSignal={p.regionSignal}
            getOptions={p.regionOptions}
            valueText={p.regionLabel}
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}extension-base`}>Server URL</Label>
          <InputS
            id={`${p.idPrefix ?? ""}extension-base`}
            type="url"
            placeholder="https://vault.example.com"
            disabled={p.disabled}
            valueSignal={p.fieldSignal("base")}
          />
        </div>

        <Show when={p.environmentSaveStatus === "saved"}>
          <p role="status" class="text-sm text-green-700 dark:text-green-400">
            Settings saved.
          </p>
        </Show>

        <Show when={p.environmentSaveStatus === "error"}>
          <p role="alert" class="text-sm text-red-600 dark:text-red-400">
            {p.errorMessage ?? "Settings could not be saved."}
          </p>
        </Show>

        <div>
          <Button variant="filledBlue" disabled={p.disabled} onClick={p.onSave}>
            {p.environmentSaveStatus === "saving" ? "Saving settings…" : "Save settings"}
          </Button>
        </div>
      </CardWrapper>
    </div>
  )
}
