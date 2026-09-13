import { Show } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { SignalObject } from "#ui/utils/createSignalObject.js"
import { ExtensionCardWrapper } from "../ui/ExtensionCardWrapper.jsx"
import { ExtensionInputS } from "../ui/ExtensionInputS.jsx"
import { ExtensionSelectSingleNative } from "../ui/ExtensionSelectSingleNative.jsx"
import { ExtensionSwitchSingle } from "../ui/ExtensionSwitchSingle.jsx"
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
    <div class="grid w-full min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      <ExtensionCardWrapper class="flex flex-col gap-4 p-5" aria-label="Autofill settings">
        <div>
          <p class="extension-info-text text-xs font-semibold tracking-wide uppercase">Autofill</p>
          <h2 class="text-lg font-semibold">Autofill on page load</h2>
          <p class="extension-muted-text text-sm">
            Off by default. When enabled, only one unambiguous login match is filled. Cards and identities are never
            filled automatically.
          </p>
        </div>
        <ExtensionSwitchSingle
          id={`${p.idPrefix ?? ""}extension-autofill-page-load`}
          disabled={p.disabled}
          valueSignal={p.autofillPageLoadSignal}
          getOptions={p.autofillOptions}
          valueText={p.autofillLabel}
          class="w-fit p-1"
        />
        <Show when={p.autofillSiteAvailable}>
          <div class="extension-boundary flex items-center justify-between gap-3 rounded-lg border p-3">
            <span class="text-sm">
              {p.autofillSiteLabel}: {p.autofillSiteDisabled ? "disabled" : "allowed"}
            </span>
            <Button variant="ghost" disabled={p.disabled} onClick={p.onAutofillSiteToggle}>
              {p.autofillSiteDisabled ? "Allow on this site" : "Disable on this site"}
            </Button>
          </div>
        </Show>
        <Show when={p.autofillSaveStatus === "saved"}>
          <p role="status" class="extension-success-text text-sm">
            Autofill settings saved.
          </p>
        </Show>
        <Show when={p.autofillSaveStatus === "error"}>
          <p role="alert" class="extension-error-text text-sm">
            Autofill settings could not be saved.
          </p>
        </Show>
        <div>
          <Button
            variant="filledBlue"
            class="extension-primary-control"
            disabled={p.disabled}
            onClick={p.onAutofillSave}
          >
            {p.autofillSaveStatus === "saving" ? "Saving autofill settings…" : "Save autofill settings"}
          </Button>
        </div>
      </ExtensionCardWrapper>
      <ExtensionCardWrapper class="flex flex-col gap-5 overflow-hidden p-5" aria-label="Security settings">
        <div class="flex flex-col gap-1">
          <p class="extension-info-text text-xs font-semibold tracking-wide uppercase">Security</p>
          <h2 class="text-lg font-semibold">Vault timeout</h2>
          <p class="extension-muted-text max-w-xl text-sm">
            Choose when an inactive unlocked vault should be secured and what happens afterward.
          </p>
        </div>

        <Show
          when={p.securityAvailable}
          fallback={
            <Show
              when={p.securityLoading}
              fallback={
                <p role="alert" class="extension-error-text text-sm">
                  {p.securityErrorMessage ?? "Security settings could not be loaded."}
                </p>
              }
            >
              <p role="status" class="extension-muted-text text-sm">
                Loading security settings…
              </p>
            </Show>
          }
        >
          <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-5">
            <div class="flex flex-col gap-1.5">
              <Label for={`${p.idPrefix ?? ""}extension-vault-timeout`}>Vault timeout</Label>
              <ExtensionSelectSingleNative
                id={`${p.idPrefix ?? ""}extension-vault-timeout`}
                disabled={p.disabled}
                valueSignal={p.securityTimeoutSignal}
                getOptions={p.securityTimeoutOptions}
                valueText={p.securityTimeoutLabel}
              />
              <p class="extension-muted-text text-xs">Measured from when the vault was unlocked.</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label for={`${p.idPrefix ?? ""}extension-vault-timeout-action`}>Vault timeout action</Label>
              <ExtensionSwitchSingle
                id={`${p.idPrefix ?? ""}extension-vault-timeout-action`}
                disabled={p.disabled}
                valueSignal={p.securityActionSignal}
                getOptions={p.securityActionOptions}
                valueText={p.securityActionLabel}
                class="w-fit p-1"
              />
              <p class="extension-muted-text text-xs">
                Lock keeps your signed-in session. Log out removes it and requires a full sign-in.
              </p>
            </div>
          </div>

          <Show when={p.securityNeverSelected}>
            <p class="extension-warning-surface rounded-lg px-3 py-2 text-xs">
              With Never selected, your vault stays unlocked until you lock it, log out, or close the browser session.
            </p>
          </Show>

          <Show when={p.securitySaveStatus === "saved"}>
            <p role="status" class="extension-success-text text-sm">
              Security settings saved.
            </p>
          </Show>

          <Show when={p.securitySaveStatus === "error"}>
            <p role="alert" class="extension-error-text text-sm">
              {p.securityErrorMessage ?? "Security settings could not be saved."}
            </p>
          </Show>

          <div>
            <Button
              variant="filledBlue"
              class="extension-primary-control"
              disabled={p.disabled}
              onClick={p.onSecuritySave}
            >
              {p.securitySaveStatus === "saving" ? "Saving security settings…" : "Save security settings"}
            </Button>
          </div>
        </Show>
      </ExtensionCardWrapper>

      <ExtensionCardWrapper class="flex flex-col gap-4 p-5" aria-label="Biometric settings">
        <div class="flex flex-col gap-1">
          <p class="extension-info-text text-xs font-semibold tracking-wide uppercase">Biometrics</p>
          <h2 class="text-lg font-semibold">Unlock with biometrics</h2>
          <p class="extension-muted-text max-w-xl text-sm">
            Use your device's biometric authenticator (such as fingerprint, Windows Hello, or Touch ID) to unlock your
            vault.
          </p>
        </div>

        <Show
          when={p.biometricCapability === "available"}
          fallback={
            <p class="extension-muted-text text-sm">
              {p.biometricCapability === "unavailable"
                ? "Biometric authentication is unavailable on this device."
                : "Biometric unlock is not supported by your browser or platform."}
            </p>
          }
        >
          <div class="extension-boundary flex items-center justify-between gap-3 rounded-lg border p-3">
            <span class="text-sm">Biometric unlock is {p.biometricEnrolled ? "enabled" : "disabled"}</span>
            <Button
              variant={p.biometricEnrolled ? "outline" : "filledBlue"}
              class={p.biometricEnrolled ? undefined : "extension-primary-control"}
              disabled={p.disabled || p.biometricSaveStatus === "saving"}
              onClick={p.biometricEnrolled ? p.onBiometricRevoke : p.onBiometricEnroll}
            >
              {p.biometricEnrolled ? "Disable biometric unlock" : "Enable biometric unlock"}
            </Button>
          </div>

          <Show when={p.biometricSaveStatus === "saved"}>
            <p role="status" class="extension-success-text text-sm">
              Biometric settings saved.
            </p>
          </Show>

          <Show when={p.biometricSaveStatus === "error"}>
            <p role="alert" class="extension-error-text text-sm">
              {p.biometricErrorMessage ?? "Biometric operation failed."}
            </p>
          </Show>
        </Show>
      </ExtensionCardWrapper>

      <ExtensionCardWrapper class="flex flex-col gap-3 p-4" aria-label="Server settings">
        <h2 class="text-base font-semibold">Server settings</h2>

        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}extension-region`}>Region</Label>
          <ExtensionSelectSingleNative
            id={`${p.idPrefix ?? ""}extension-region`}
            disabled={p.disabled}
            valueSignal={p.regionSignal}
            getOptions={p.regionOptions}
            valueText={p.regionLabel}
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}extension-base`}>Server URL</Label>
          <ExtensionInputS
            id={`${p.idPrefix ?? ""}extension-base`}
            type="url"
            placeholder="https://vault.example.com"
            disabled={p.disabled}
            valueSignal={p.fieldSignal("base")}
          />
        </div>

        <Show when={p.environmentSaveStatus === "saved"}>
          <p role="status" class="extension-success-text text-sm">
            Settings saved.
          </p>
        </Show>

        <Show when={p.environmentSaveStatus === "error"}>
          <p role="alert" class="extension-error-text text-sm">
            {p.errorMessage ?? "Settings could not be saved."}
          </p>
        </Show>

        <div>
          <Button variant="filledBlue" class="extension-primary-control" disabled={p.disabled} onClick={p.onSave}>
            {p.environmentSaveStatus === "saving" ? "Saving settings…" : "Save settings"}
          </Button>
        </div>
      </ExtensionCardWrapper>
    </div>
  )
}
