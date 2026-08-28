import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Separator } from "#ui/static/separator/Separator.jsx"
import type { ExtensionFullWindowCopyableField } from "./ExtensionFullWindowCopyableField.js"
import type { ExtensionFullWindowLogin } from "./ExtensionFullWindowLogin.js"

export interface ExtensionFullWindowLoginDetailProps {
  login: ExtensionFullWindowLogin
  disabled: boolean
  fillAvailable: boolean
  fieldIsCopied: (field: ExtensionFullWindowCopyableField) => boolean
  onFill: (login: ExtensionFullWindowLogin) => void
  onCopy: (login: ExtensionFullWindowLogin, field: ExtensionFullWindowCopyableField) => void
  onClose: () => void
}

/** Detail pane of the selected login with explicit fill and per-field copy controls. */
export function ExtensionFullWindowLoginDetail(p: ExtensionFullWindowLoginDetailProps) {
  return (
    <CardWrapper class="p-4" aria-label={`Details of ${p.login.name}`}>
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h2 class="truncate text-base font-semibold">{p.login.name}</h2>
          <p class="truncate text-sm text-gray-600 dark:text-gray-300">{p.login.username ?? "No username"}</p>
          <p class="truncate text-xs text-gray-600 dark:text-gray-300">{p.login.uri ?? "No URI"}</p>
        </div>
        <div class="flex shrink-0 gap-1">
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
          <Button variant="ghost" size="sm" aria-label="Close details" onClick={p.onClose}>
            Close
          </Button>
        </div>
      </div>

      <Separator />

      <Show
        when={p.login.copyableFields.length > 0}
        fallback={<p class="text-sm text-gray-600 dark:text-gray-300">No copyable fields.</p>}
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
        </ul>
      </Show>
    </CardWrapper>
  )
}
