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
    <article class="grid min-w-0 grid-cols-2" aria-label={p.login.name}>
      <div class="col-span-2 flex min-w-0 items-start justify-between gap-2">
        <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold">{p.login.name}</h2>
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
        <div class="col-span-2 mt-2 grid min-w-0 grid-cols-2 gap-1">
          <For each={p.login.copyableFields}>
            {(field) => (
              <ButtonIcon
                variant="outline"
                icon={fieldIconPathGet(field.label)}
                iconClass="size-3.5"
                disabled={p.disabled}
                aria-label={`Copy ${field.label} of ${p.login.name}`}
                onClick={() => p.onCopy(p.login, field)}
                class="min-w-0 w-full"
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
              class="min-w-0 w-full"
            >
              {p.totpIsCopied(p.login) ? "TOTP code copied" : "TOTP code"}
            </ButtonIcon>
          </Show>
        </div>
      </Show>
    </article>
  )
}
