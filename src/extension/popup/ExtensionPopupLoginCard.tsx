import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { ExtensionCopyableField } from "../ExtensionCopyableField.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"

export interface ExtensionPopupLoginCardProps {
  login: ExtensionLogin
  disabled: boolean
  fillAvailable: boolean
  fieldIsCopied: (field: ExtensionCopyableField) => boolean
  onFill: (login: ExtensionLogin) => void
  onCopy: (login: ExtensionLogin, field: ExtensionCopyableField) => void
  totpIsCopied: (login: ExtensionLogin) => boolean
  onTotpCopy: (login: ExtensionLogin) => void
}

/** One matched login with its explicit fill and per-field copy controls. */
export function ExtensionPopupLoginCard(p: ExtensionPopupLoginCardProps) {
  return (
    <CardWrapper
      class="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
      aria-label={p.login.name}
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">{p.login.name}</p>
          <p class="truncate text-xs text-slate-600 dark:text-slate-300">{p.login.username ?? "No username"}</p>
        </div>
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
      </div>
      <Show when={p.login.copyableFields.length > 0 || p.login.totpAvailable}>
        <div class="mt-2 flex flex-wrap gap-1">
          <For each={p.login.copyableFields}>
            {(field) => (
              <Button
                variant="outline"
                size="sm"
                disabled={p.disabled}
                aria-label={`Copy ${field.label} of ${p.login.name}`}
                onClick={() => p.onCopy(p.login, field)}
              >
                {p.fieldIsCopied(field) ? `${field.label} copied` : field.label}
              </Button>
            )}
          </For>
          <Show when={p.login.totpAvailable}>
            <Button
              variant="outline"
              size="sm"
              disabled={p.disabled}
              aria-label={`Copy TOTP code of ${p.login.name}`}
              onClick={() => p.onTotpCopy(p.login)}
            >
              {p.totpIsCopied(p.login) ? "TOTP code copied" : "TOTP code"}
            </Button>
          </Show>
        </div>
      </Show>
    </CardWrapper>
  )
}
