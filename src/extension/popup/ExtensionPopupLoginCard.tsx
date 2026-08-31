import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { ExtensionPopupCopyableField } from "./ExtensionPopupCopyableField.js"
import type { ExtensionPopupLogin } from "./ExtensionPopupLogin.js"

export interface ExtensionPopupLoginCardProps {
  login: ExtensionPopupLogin
  disabled: boolean
  fillAvailable: boolean
  fieldIsCopied: (field: ExtensionPopupCopyableField) => boolean
  onFill: (login: ExtensionPopupLogin) => void
  onCopy: (login: ExtensionPopupLogin, field: ExtensionPopupCopyableField) => void
  totpIsCopied: (login: ExtensionPopupLogin) => boolean
  onTotpCopy: (login: ExtensionPopupLogin) => void
}

/** One matched login with its explicit fill and per-field copy controls. */
export function ExtensionPopupLoginCard(p: ExtensionPopupLoginCardProps) {
  return (
    <CardWrapper class="p-3" aria-label={p.login.name}>
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">{p.login.name}</p>
          <p class="truncate text-xs text-gray-600 dark:text-gray-300">{p.login.username ?? "No username"}</p>
        </div>
        <Show when={p.fillAvailable}>
          <Button
            variant="filled"
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
