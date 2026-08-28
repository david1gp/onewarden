import { For, Show } from "solid-js"
import type { SignalObject } from "#ui/utils/createSignalObject.js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { ExtensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"

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
}

/** Server environment settings for official regions, a self-hosted base, and per-service overrides. */
export function ExtensionFullWindowSettingsPane(p: ExtensionFullWindowSettingsPaneProps) {
  return (
    <CardWrapper class="flex max-w-2xl flex-col gap-3 p-4" aria-label="Server settings">
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
  )
}
