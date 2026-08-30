import { For, type JSX, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type CipherLoginFormSectionStateProps,
  cipherLoginFormSectionStateCreate,
} from "./cipherLoginFormSectionStateCreate.js"

export function CipherLoginFormSection(props: CipherLoginFormSectionStateProps): JSX.Element {
  const state = cipherLoginFormSectionStateCreate(props)

  return (
    <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <p class="font-semibold text-slate-900 text-sm dark:text-slate-100">Login Credentials</p>

      {/* Username */}
      <div class="space-y-1">
        <Label for="cipher-username" class="text-sm">
          Username / Email
        </Label>
        <InputS
          id="cipher-username"
          type="text"
          placeholder="e.g. user@example.com"
          valueSignal={state.usernameSignal}
          class="h-9 w-full text-sm"
        />
      </div>

      {/* Password */}
      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <Label for="cipher-password" class="text-sm">
            Password
          </Label>
          <div class="flex items-center gap-2">
            <Show when={state.passwordStrength()}>
              {(strength) => (
                <Badge
                  variant={
                    strength() === "Very Strong" || strength() === "Strong"
                      ? "filledGreen"
                      : strength() === "Medium"
                        ? "subtle"
                        : "filledRed"
                  }
                  class="px-1.5 py-0 text-sm"
                >
                  {strength()}
                </Badge>
              )}
            </Show>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 px-2 text-sm text-blue-700 hover:text-blue-800 dark:text-blue-300"
              onClick={() => state.generatePassword()}
            >
              <Icon path={vaultSvgIcons.refresh} class="mr-1.5 size-3.5" />
              Generate
            </Button>
          </div>
        </div>
        <div class="relative flex items-center">
          <InputS
            id="cipher-password"
            type={state.isPasswordRevealed() ? "text" : "password"}
            placeholder="Enter password"
            valueSignal={state.passwordSignal}
            class="h-9 w-full pr-16 text-sm font-mono"
          />
          <div class="absolute right-1 flex items-center">
            <ButtonIcon
              variant="ghost"
              size="sm"
              icon={state.isPasswordRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
              iconClass="size-3.5"
              onClick={() => state.togglePasswordReveal()}
              class="h-8 px-2 text-sm text-slate-600 dark:text-slate-400"
              aria-label={state.isPasswordRevealed() ? "Hide password" : "Show password"}
            >
              {state.isPasswordRevealed() ? "Hide" : "Show"}
            </ButtonIcon>
          </div>
        </div>
      </div>

      {/* Authenticator Key (TOTP) */}
      <div class="space-y-1">
        <Label for="cipher-totp" class="text-sm">
          Authenticator Key (TOTP Seed)
        </Label>
        <InputS
          id="cipher-totp"
          type="text"
          placeholder="Base32 key (e.g. JBSWY3DPEHPK3PXP)"
          valueSignal={state.totpSignal}
          class="h-9 w-full text-sm font-mono"
        />
      </div>

      {/* Website URIs */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label class="text-sm">Website URLs</Label>
          <Button variant="ghost" size="sm" class="h-8 px-2 text-sm" onClick={() => state.addUri()}>
            <Icon path={vaultSvgIcons.plus} class="mr-1.5 size-3.5" />
            Add URL
          </Button>
        </div>
        <Show
          when={state.urisSignal && state.urisSignal().length > 0}
          fallback={
            <InputS
              id="cipher-uri"
              type="url"
              placeholder="https://example.com/login"
              valueSignal={state.uriSignal}
              class="h-9 w-full text-sm"
            />
          }
        >
          <div class="space-y-2">
            <For each={state.urisSignal?.()}>
              {(entry, index) => (
                <div class="flex items-center gap-2">
                  <Input
                    id={`cipher-uri-${index()}`}
                    type="url"
                    placeholder="https://example.com/login"
                    value={entry.uri}
                    onInput={(e) => state.updateUri(index(), e.currentTarget.value)}
                    class="h-9 w-full text-sm"
                    aria-label={`Website URL ${index() + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-9 shrink-0 px-2 text-sm text-rose-700 dark:text-rose-300"
                    onClick={() => state.removeUri(index())}
                    aria-label={`Remove website URL ${index() + 1}`}
                  >
                    <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                    Remove
                  </Button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </CardWrapper>
  )
}
