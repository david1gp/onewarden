import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { fieldIconPathGet } from "../../shared/field/fieldIconPathGet.js"
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
    <article class="min-w-0" aria-label={p.login.name}>
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">{p.login.name}</p>
          <p class="extension-muted-text truncate text-xs">{p.login.username ?? "No username"}</p>
        </div>
        <Show when={p.fillAvailable}>
          <Button
            variant="filledBlue"
            disabled={p.disabled}
            aria-label={`Fill ${p.login.name}`}
            onClick={() => p.onFill(p.login)}
            class="extension-primary-control"
          >
            Fill
          </Button>
        </Show>
      </div>
      <Show when={p.login.copyableFields.length > 0 || p.login.totpAvailable}>
        <div class="mt-2 flex flex-wrap gap-1">
          <For each={p.login.copyableFields}>
            {(field) => (
              <ButtonIcon
                variant="outline"
                icon={fieldIconPathGet(field.label)}
                iconClass="size-3.5"
                disabled={p.disabled}
                aria-label={`Copy ${field.label} of ${p.login.name}`}
                onClick={() => p.onCopy(p.login, field)}
              >
                {p.fieldIsCopied(field) ? `${field.label} copied` : field.label}
              </ButtonIcon>
            )}
          </For>
          <Show when={p.login.totpAvailable}>
            <ButtonIcon
              variant="outline"
              icon={fieldIconPathGet("TOTP code")}
              iconClass="size-3.5"
              disabled={p.disabled}
              aria-label={`Copy TOTP code of ${p.login.name}`}
              onClick={() => p.onTotpCopy(p.login)}
            >
              {p.totpIsCopied(p.login) ? "TOTP code copied" : "TOTP code"}
            </ButtonIcon>
          </Show>
        </div>
      </Show>
    </article>
  )
}
