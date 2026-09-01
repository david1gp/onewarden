import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { Separator } from "#ui/static/separator/Separator.jsx"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import type { ExtensionCopyableField } from "../ExtensionCopyableField.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import { ExtensionFullWindowAssignmentPanel } from "./ExtensionFullWindowAssignmentPanel.jsx"
import { ExtensionFullWindowCipherExtras } from "./ExtensionFullWindowCipherExtras.jsx"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"

export interface ExtensionFullWindowLoginDetailProps {
  login: ExtensionLogin
  cipher: () => ExtensionPersonalLoginCipher | null
  detailLoading: boolean
  disabled: boolean
  fillAvailable: boolean
  fieldIsCopied: (field: ExtensionCopyableField) => boolean
  onFill: (login: ExtensionLogin) => void
  onCopy: (login: ExtensionLogin, field: ExtensionCopyableField) => void
  totpIsCopied: (login: ExtensionLogin) => boolean
  onTotpCopy: (login: ExtensionLogin) => void
  onEdit: (login: ExtensionLogin) => void
  onClose: () => void
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  idPrefix?: string
}

/** Detail pane of the selected login with explicit fill and per-field copy controls. */
export function ExtensionFullWindowLoginDetail(p: ExtensionFullWindowLoginDetailProps) {
  return (
    <CardWrapper
      class="border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
      aria-label={`Details of ${p.login.name}`}
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h2 class="truncate text-base font-semibold">{p.login.name}</h2>
          <p class="truncate text-sm text-slate-600 dark:text-slate-300">{p.login.username ?? "No username"}</p>
          <p class="truncate text-xs text-slate-600 dark:text-slate-300">{p.login.uri ?? "No URI"}</p>
        </div>
        <div class="flex shrink-0 gap-1">
          <Show when={p.fillAvailable}>
            <Button
              variant="filledBlue"
              size="sm"
              disabled={p.disabled}
              aria-label={`Fill ${p.login.name}`}
              onClick={() => p.onFill(p.login)}
            >
              Fill
            </Button>
          </Show>
          <Button
            variant="outline"
            size="sm"
            disabled={p.disabled || p.login.edit === false || p.login.viewPassword === false}
            aria-label={`Edit ${p.login.name} in OneWarden`}
            onClick={() => p.onEdit(p.login)}
          >
            Edit
          </Button>
          <Button variant="ghost" size="sm" aria-label="Close details" onClick={p.onClose}>
            Close
          </Button>
        </div>
      </div>

      <Separator />

      <Show
        when={p.login.copyableFields.length > 0 || p.login.totpAvailable}
        fallback={<p class="text-sm text-slate-600 dark:text-slate-300">No copyable fields.</p>}
      >
        <ul class="flex list-none flex-col gap-1">
          <For each={p.login.copyableFields}>
            {(field) => (
              <li class="flex items-center justify-between gap-2">
                <span class="min-w-0 truncate text-sm">{field.label}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={p.disabled}
                  aria-label={`Copy ${field.label} of ${p.login.name}`}
                  onClick={() => p.onCopy(p.login, field)}
                >
                  {p.fieldIsCopied(field) ? "Copied" : "Copy"}
                </Button>
              </li>
            )}
          </For>
          <Show when={p.login.totpAvailable}>
            <li class="flex items-center justify-between gap-2">
              <span class="min-w-0 truncate text-sm">TOTP code</span>
              <Button
                variant="outline"
                size="sm"
                disabled={p.disabled}
                aria-label={`Copy TOTP code of ${p.login.name}`}
                onClick={() => p.onTotpCopy(p.login)}
              >
                {p.totpIsCopied(p.login) ? "Copied" : "Copy"}
              </Button>
            </li>
          </Show>
        </ul>
      </Show>
      <ExtensionFullWindowAssignmentPanel
        model={p.model}
        commands={p.commands}
        source={() => p.login}
        idPrefix={p.idPrefix}
      />
      <Show when={p.detailLoading}>
        <div role="status" aria-label="Loading login attachments and password history" class="flex justify-center py-4">
          <LoaderShuffle4Dots />
        </div>
      </Show>
      <Show when={p.detailLoading ? null : p.cipher()}>
        {(cipher) => (
          <ExtensionFullWindowCipherExtras
            cipher={cipher}
            model={p.model}
            commands={p.commands}
            idPrefix={p.idPrefix}
          />
        )}
      </Show>
    </CardWrapper>
  )
}
