import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { LinkTextExternal } from "#ui/interactive/link/LinkText.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classesScrollbar } from "#ui/static/scrollbar/classesScrollbar.js"
import { type VaultEntryDetailStateProps, vaultEntryDetailStateCreate } from "./vaultEntryDetailStateCreate.js"
import { vaultSvgIcons } from "./vaultSvgIcons.js"

export function VaultEntryDetail(props: VaultEntryDetailStateProps): JSX.Element {
  const state = vaultEntryDetailStateCreate(props)

  return (
    <article class="flex h-full min-w-0 flex-col bg-slate-50/50 text-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
      <Show
        when={state.item()}
        fallback={
          <div class="flex h-full flex-col items-center justify-center p-6 text-center sm:p-8">
            <div class="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Icon path={vaultSvgIcons.lock} class="size-7" />
            </div>
            <p class="mt-4 font-semibold text-sm text-slate-800 dark:text-slate-200">No Item Selected</p>
            <p class="mt-1 max-w-xs text-xs text-slate-600 dark:text-slate-400">
              Select an item from the list to view stored credentials, secure notes, and metadata.
            </p>
          </div>
        }
      >
        {(item) => (
          <div class={`flex-1 overflow-y-auto ${classesScrollbar} p-4 sm:p-6`}>
            {/* Header / Title Banner */}
            <div class="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5 sm:gap-4 dark:border-slate-800">
              <div class="flex min-w-0 items-start gap-3.5">
                <div
                  class={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-xs ${state.categoryTheme().bg} ${state.categoryTheme().text}`}
                >
                  <Icon path={state.getCategoryIcon(item().category)} class="size-6" />
                </div>
                <div class="min-w-0 flex-1">
                  <h2 class="break-words font-bold text-xl text-slate-900 tracking-tight dark:text-slate-50">
                    {item().title}
                  </h2>
                  <div class="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="subtle" class="text-xs">
                      {item().vault} Vault
                    </Badge>
                    <Badge variant="outline" class="text-xs">
                      {state.getCategoryLabel(item().category)}
                    </Badge>
                    <span class="text-xs text-slate-600 dark:text-slate-400">Updated {item().updatedAt}</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div class="flex shrink-0 items-center gap-2">
                <ButtonIcon
                  variant="outline"
                  size="sm"
                  class="text-xs"
                  icon={item().favorite ? vaultSvgIcons.star : vaultSvgIcons.starOutline}
                  iconClass={`size-4 fill-current dark:fill-current ${
                    item().favorite ? "text-amber-500 dark:text-amber-400" : "text-slate-600 dark:text-slate-400"
                  }`}
                  onClick={() => state.toggleFavorite()}
                  aria-label="Toggle Favorite"
                >
                  {item().favorite ? "Favorited" : "Favorite"}
                </ButtonIcon>
                <Button variant="ghost" size="sm" class="text-xs">
                  Edit
                </Button>
              </div>
            </div>

            {/* Content Sections Grid */}
            <div class="max-w-3xl space-y-4">
              {/* Primary Credentials Section */}
              <Show when={item().username || item().password || item().totp || item().url}>
                <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  {/* Username Field */}
                  <Show when={item().username}>
                    <div class="group flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Username
                        </p>
                        <p class="truncate font-medium text-sm text-slate-900 select-all dark:text-slate-100">
                          {item().username}
                        </p>
                      </div>
                      <ButtonIcon
                        variant="subtle"
                        size="sm"
                        class="shrink-0 text-xs"
                        icon={state.copiedField() === "username" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                        iconClass={`size-3.5 fill-current dark:fill-current ${
                          state.copiedField() === "username"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                        onClick={() => state.copyToClipboard("username", item().username ?? "")}
                      >
                        {state.copiedField() === "username" ? "Copied" : "Copy"}
                      </ButtonIcon>
                    </div>
                  </Show>

                  {/* Password Field */}
                  <Show when={item().password}>
                    <div class="group flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                            Password
                          </p>
                          <Show when={item().passwordStrength}>
                            <Badge variant="filledGreen" class="px-1.5 py-0 text-[10px]">
                              {item().passwordStrength}
                            </Badge>
                          </Show>
                        </div>
                        <p class="truncate font-mono text-sm tracking-wider text-slate-900 select-all dark:text-slate-100">
                          {state.isPasswordRevealed() ? item().password : "••••••••••••••••••••"}
                        </p>
                      </div>
                      <div class="flex shrink-0 items-center gap-1.5">
                        <ButtonIcon
                          variant="ghost"
                          size="sm"
                          class="text-xs"
                          icon={state.isPasswordRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                          iconClass="size-3.5 fill-current dark:fill-current text-slate-600 dark:text-slate-400"
                          onClick={() => state.togglePasswordReveal()}
                        >
                          {state.isPasswordRevealed() ? "Hide" : "Show"}
                        </ButtonIcon>
                        <ButtonIcon
                          variant="subtle"
                          size="sm"
                          class="text-xs"
                          icon={state.copiedField() === "password" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                          iconClass={`size-3.5 fill-current dark:fill-current ${
                            state.copiedField() === "password"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                          onClick={() => state.copyToClipboard("password", item().password ?? "")}
                        >
                          {state.copiedField() === "password" ? "Copied" : "Copy"}
                        </ButtonIcon>
                      </div>
                    </div>
                  </Show>

                  {/* One-Time Password / 2FA */}
                  <Show when={item().totp}>
                    <div class="group flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5">
                          <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                            One-Time Password (2FA)
                          </p>
                          <span class="size-1.5 animate-pulse rounded-full bg-blue-500" />
                        </div>
                        <p class="truncate font-mono font-bold text-blue-600 text-lg tracking-wider select-all dark:text-blue-400">
                          {item().totp}
                        </p>
                      </div>
                      <ButtonIcon
                        variant="subtle"
                        size="sm"
                        class="shrink-0 text-xs"
                        icon={state.copiedField() === "totp" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                        iconClass={`size-3.5 fill-current dark:fill-current ${
                          state.copiedField() === "totp"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                        onClick={() => state.copyToClipboard("totp", item().totp?.replace(/\s+/g, "") ?? "")}
                      >
                        {state.copiedField() === "totp" ? "Copied" : "Copy"}
                      </ButtonIcon>
                    </div>
                  </Show>

                  {/* Website URL */}
                  <Show when={item().url}>
                    <div class="group flex items-center justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Website
                        </p>
                        <LinkTextExternal
                          href={item().url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex max-w-full items-center gap-1 font-medium text-blue-600 text-xs dark:text-blue-400"
                        >
                          <span class="truncate">{item().url}</span>
                          <Icon path={vaultSvgIcons.externalLink} class="size-3 shrink-0" />
                        </LinkTextExternal>
                      </div>
                      <ButtonIcon
                        variant="subtle"
                        size="sm"
                        class="shrink-0 text-xs"
                        icon={state.copiedField() === "url" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                        iconClass={`size-3.5 fill-current dark:fill-current ${
                          state.copiedField() === "url"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                        onClick={() => state.copyToClipboard("url", item().url ?? "")}
                      >
                        {state.copiedField() === "url" ? "Copied" : "Copy"}
                      </ButtonIcon>
                    </div>
                  </Show>
                </CardWrapper>
              </Show>

              {/* Custom Fields Section */}
              <Show when={item().customFields && (item().customFields?.length ?? 0) > 0}>
                <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <p class="font-semibold text-slate-900 text-xs dark:text-slate-100">Additional Fields</p>
                  <div class="space-y-2.5">
                    <For each={item().customFields}>
                      {(field, idx) => {
                        const isRevealed = () => !field.concealed || state.isFieldRevealed(idx())

                        return (
                          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0 dark:border-slate-800/80">
                            <div class="min-w-0 flex-1">
                              <p class="truncate font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                                {field.label}
                              </p>
                              <p class="truncate font-mono text-slate-800 text-xs select-all dark:text-slate-200">
                                {isRevealed() ? field.value : "••••••••••••"}
                              </p>
                            </div>
                            <div class="flex shrink-0 items-center gap-1.5">
                              <Show when={field.concealed}>
                                <ButtonIcon
                                  variant="ghost"
                                  size="sm"
                                  class="text-xs"
                                  icon={isRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                                  iconClass="size-3.5 fill-current dark:fill-current text-slate-600 dark:text-slate-400"
                                  onClick={() => state.toggleConcealedField(idx())}
                                >
                                  {isRevealed() ? "Hide" : "Show"}
                                </ButtonIcon>
                              </Show>
                              <ButtonIcon
                                variant="subtle"
                                size="sm"
                                class="text-xs"
                                icon={
                                  state.copiedField() === `custom-${idx()}` ? vaultSvgIcons.check : vaultSvgIcons.copy
                                }
                                iconClass={`size-3.5 fill-current dark:fill-current ${
                                  state.copiedField() === `custom-${idx()}`
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-600 dark:text-slate-400"
                                }`}
                                onClick={() => state.copyToClipboard(`custom-${idx()}`, field.value)}
                              >
                                {state.copiedField() === `custom-${idx()}` ? "Copied" : "Copy"}
                              </ButtonIcon>
                            </div>
                          </div>
                        )
                      }}
                    </For>
                  </div>
                </CardWrapper>
              </Show>

              {/* Secure Notes Section */}
              <Show when={item().notes}>
                <CardWrapper class="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <p class="font-semibold text-slate-900 text-xs dark:text-slate-100">Secure Notes</p>
                  <pre class="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-slate-700 text-xs leading-relaxed dark:bg-slate-950 dark:text-slate-300">
                    {item().notes}
                  </pre>
                </CardWrapper>
              </Show>

              {/* Folder & Metadata Footer */}
              <CardWrapper class="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <p class="font-semibold text-slate-900 text-xs dark:text-slate-100">Metadata & Folder</p>
                <div class="flex flex-wrap items-center gap-1.5">
                  <Badge variant="subtle" class="text-xs">
                    {item().folder ?? "No Folder"}
                  </Badge>
                </div>
                <div class="pt-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Created {item().createdAt}</span>
                </div>
              </CardWrapper>
            </div>
          </div>
        )}
      </Show>
    </article>
  )
}
