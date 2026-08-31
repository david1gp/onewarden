import { For, Show } from "solid-js"
import type { SignalObject } from "#ui/utils/createSignalObject.js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { SwitchSingle } from "#ui/input/switch/SwitchSingle.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { ExtensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import type { ExtensionFullWindowSecuritySaveStatus } from "./ExtensionFullWindowSecuritySaveStatus.js"

type ExtensionFullWindowSettingsField = "webVault" | "api" | "identity" | "icons" | "notifications" | "events"

const overrideFields: { field: ExtensionFullWindowSettingsField; label: string }[] = [
  { field: "webVault", label: "Web vault URL" },
  { field: "api", label: "API URL" },
  { field: "identity", label: "Identity URL" },
  { field: "icons", label: "Icons URL" },
  { field: "notifications", label: "Notifications URL" },
  { field: "events", label: "Events URL" },
]

export interface ExtensionFullWindowSettingsPaneProps {
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
}

/** Security and server controls for the full-window settings pane. */
export function ExtensionFullWindowSettingsPane(p: ExtensionFullWindowSettingsPaneProps) {
  return (
    <div class="flex max-w-2xl flex-col gap-4">
      <CardWrapper
        class="flex flex-col gap-5 overflow-hidden border-blue-200 bg-gradient-to-br from-white to-blue-50/70 p-5 dark:border-blue-900 dark:from-slate-950 dark:to-blue-950/30"
        aria-label="Security settings"
      >
        <div class="flex flex-col gap-1">
          <p class="text-xs font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-300">Security</p>
          <h2 class="text-lg font-semibold">Vault timeout</h2>
          <p class="max-w-xl text-sm text-gray-600 dark:text-gray-300">
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
              <p role="status" class="text-sm text-gray-600 dark:text-gray-300">
                Loading security settings…
              </p>
            </Show>
          }
        >
          <div class="grid gap-5 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <Label for="extension-vault-timeout">Vault timeout</Label>
              <SelectSingleNative
                id="extension-vault-timeout"
                disabled={p.disabled}
                valueSignal={p.securityTimeoutSignal}
                getOptions={p.securityTimeoutOptions}
                valueText={p.securityTimeoutLabel}
              />
              <p class="text-xs text-gray-600 dark:text-gray-300">Measured from when the vault was unlocked.</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label for="extension-vault-timeout-action">Vault timeout action</Label>
              <SwitchSingle
                id="extension-vault-timeout-action"
                disabled={p.disabled}
                valueSignal={p.securityActionSignal}
                getOptions={p.securityActionOptions}
                valueText={p.securityActionLabel}
                class="w-fit p-1"
              />
              <p class="text-xs text-gray-600 dark:text-gray-300">
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
            <Button variant="filled" disabled={p.disabled} onClick={p.onSecuritySave}>
              {p.securitySaveStatus === "saving" ? "Saving security settings…" : "Save security settings"}
            </Button>
          </div>
        </Show>
      </CardWrapper>

      <CardWrapper class="flex flex-col gap-3 p-4" aria-label="Server settings">
        <h2 class="text-base font-semibold">Server settings</h2>

        <div class="flex flex-col gap-1">
          <Label for="extension-region">Region</Label>
          <SelectSingleNative
            id="extension-region"
            disabled={p.disabled}
            valueSignal={p.regionSignal}
            getOptions={p.regionOptions}
            valueText={p.regionLabel}
          />
        </div>

        <Show when={p.isSelfHosted}>
          <div class="flex flex-col gap-1">
            <Label for="extension-base">Server base URL</Label>
            <InputS
              id="extension-base"
              type="url"
              placeholder="https://vault.example.com"
              disabled={p.disabled}
              valueSignal={p.fieldSignal("base")}
            />
          </div>
        </Show>

        <p class="text-xs text-gray-600 dark:text-gray-300">
          Leave an override empty to derive it from the selected region or base URL.
        </p>

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

        <For each={overrideFields}>
          {(entry) => (
            <div class="flex flex-col gap-1">
              <Label for={`extension-${entry.field}`}>{entry.label}</Label>
              <InputS
                id={`extension-${entry.field}`}
                type="url"
                placeholder="Derived"
                disabled={p.disabled}
                valueSignal={p.fieldSignal(entry.field)}
              />
            </div>
          )}
        </For>

        <div>
          <Button variant="filled" disabled={p.disabled} onClick={p.onSave}>
            {p.environmentSaveStatus === "saving" ? "Saving settings…" : "Save settings"}
          </Button>
        </div>
      </CardWrapper>
    </div>
  )
}
