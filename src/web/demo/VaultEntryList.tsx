import { For, type JSX, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classesScrollbar } from "#ui/static/scrollbar/classesScrollbar.js"
import { VaultEntryFavicon } from "./VaultEntryFavicon.jsx"
import { type VaultEntryListStateProps, vaultEntryListStateCreate } from "./vaultEntryListStateCreate.js"
import { vaultSvgIcons } from "./vaultSvgIcons.js"

const mdiClose = "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"

export function VaultEntryList(props: VaultEntryListStateProps): JSX.Element {
  const state = vaultEntryListStateCreate(props)

  return (
    <section
      aria-label="Vault Items"
      class="flex h-full w-full flex-col bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200"
    >
      <div class="border-b border-slate-200 p-3 dark:border-slate-800">
        <div class="relative flex items-center">
          <Icon
            path={vaultSvgIcons.search}
            class="pointer-events-none absolute left-2.5 size-4 text-slate-400 dark:text-slate-500"
          />
          <Input
            type="search"
            placeholder="Search items, folders, usernames... (Press / to focus)"
            ref={props.searchInputElement}
            value={state.searchQuery()}
            onInput={(event) => state.setSearchQuery(event.currentTarget.value)}
            class="h-8 w-full rounded-md border-slate-200 bg-slate-50 pl-8 pr-8 text-sm placeholder:text-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900"
          />
          <Show when={state.searchQuery().length > 0}>
            <ButtonIconOnly
              variant="ghost"
              title="Clear search"
              aria-label="Clear search"
              icon={mdiClose}
              iconClass="size-3.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 fill-current dark:fill-current"
              onClick={() => state.setSearchQuery("")}
              class="absolute right-1 size-8 p-0"
            />
          </Show>
        </div>

        <div class="mt-2.5 flex items-center justify-between px-0.5 text-sm">
          <div class="flex items-center gap-1.5">
            <span class="font-semibold text-slate-900 dark:text-slate-100">{state.filterTitle()}</span>
            <span class="text-sm text-slate-600 dark:text-slate-400">({state.items().length})</span>
          </div>
          <Button
            variant="filled"
            size="sm"
            class="h-8 bg-blue-600 px-2 text-sm text-white hover:bg-blue-700"
            onClick={state.addNewItem}
          >
            <Icon path={vaultSvgIcons.plus} class="mr-1 size-3" />
            New Item
          </Button>
        </div>
      </div>

      <div class={`flex-1 overflow-y-auto ${classesScrollbar}`}>
        <Show
          when={state.items().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center p-8 text-center">
              <div class="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <Icon path={vaultSvgIcons.search} class="size-5" />
              </div>
              <p class="mt-3 font-medium text-sm text-slate-800 dark:text-slate-200">No matching items</p>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Try changing your search keywords or filter selection.
              </p>
              <Button variant="ghost" size="sm" class="mt-3 h-8 text-sm" onClick={() => state.resetFilter()}>
                <Icon path={vaultSvgIcons.refresh} class="mr-1.5 size-3.5" />
                Clear filters
              </Button>
            </div>
          }
        >
          <ul aria-label="Vault Credentials" class="divide-y divide-slate-100 dark:divide-slate-800/60">
            <For each={state.items()}>
              {(item) => {
                const theme = state.getCategoryTheme(item.category)
                const isSelected = () => state.selectedItemId() === item.id

                return (
                  <li>
                    <ButtonIcon
                      variant="none"
                      size="none"
                      aria-current={isSelected() ? "true" : undefined}
                      onClick={() => state.selectItem(item.id)}
                      class={`flex w-full items-start justify-start gap-2.5 rounded-none px-3 py-2.5 text-left font-normal transition-colors ${
                        isSelected()
                          ? "border-l-4 border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <VaultEntryFavicon
                        url={() => item.url}
                        categoryIcon={() => state.getCategoryIcon(item.category)}
                        class={`${theme.bg} ${theme.text}`}
                      />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-1">
                          <p class="truncate font-semibold text-sm text-slate-900 dark:text-slate-100">{item.title}</p>
                          <Show when={item.favorite}>
                            <Icon
                              path={vaultSvgIcons.star}
                              class="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                            />
                          </Show>
                        </div>
                        <p class="truncate text-sm text-slate-600 dark:text-slate-400">{state.getItemSubtitle(item)}</p>
                        <div class="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                          <Badge variant="subtle" class="max-w-full truncate px-1.5 py-0 text-sm font-medium">
                            {item.vault}
                          </Badge>
                          <Show when={item.folder}>
                            <span class="inline-flex max-w-full items-center truncate text-sm text-slate-600 dark:text-slate-400">
                              {item.folder}
                            </span>
                          </Show>
                          <Show when={item.totp}>
                            <span class="inline-flex items-center gap-0.5 text-sm text-blue-600 font-medium dark:text-blue-400">
                              <Icon path={vaultSvgIcons.timer} class="size-3" />
                              2FA
                            </span>
                          </Show>
                        </div>
                      </div>
                    </ButtonIcon>
                  </li>
                )
              }}
            </For>
          </ul>
        </Show>
      </div>
    </section>
  )
}
