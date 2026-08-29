import { For, type JSX, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { ButtonIcon1 } from "#ui/interactive/button/ButtonIcon1.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationCollectionListProps,
  organizationCollectionListStateCreate,
} from "./organizationCollectionListStateCreate.js"

export function OrganizationCollectionList(props: OrganizationCollectionListProps): JSX.Element {
  const state = organizationCollectionListStateCreate(props)

  return (
    <div class="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Header & Search */}
      <div class="border-b border-slate-200 p-3 dark:border-slate-800">
        <div class="flex items-center justify-between gap-2">
          <span class="font-bold text-slate-900 text-sm dark:text-slate-100">
            Collections ({state.filteredCollections().length})
          </span>
          <ButtonIcon1
            variant="filled"
            size="sm"
            icon={vaultSvgIcons.plus}
            onClick={state.onCreateClick}
            class="h-7 gap-1 px-2 text-xs"
            iconClass="size-3.5 mr-1"
          >
            <span>New Collection</span>
          </ButtonIcon1>
        </div>
        <div class="relative mt-2.5 flex items-center">
          <Icon
            path={vaultSvgIcons.search}
            class="pointer-events-none absolute left-2.5 size-3.5 text-slate-400 dark:text-slate-500"
          />
          <Input
            type="search"
            placeholder="Search collections..."
            value={state.searchQuery()}
            onInput={(e) => state.handleSearchChange(e.currentTarget.value)}
            class="h-8 w-full rounded-md border-slate-200 bg-slate-50 pl-8 pr-3 text-xs placeholder:text-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900"
          />
        </div>
      </div>

      {/* Collections List */}
      <div class="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        <For
          each={state.filteredCollections()}
          fallback={
            <div class="p-6 text-center text-slate-400 text-xs">
              <p>No collections found.</p>
            </div>
          }
        >
          {(col) => {
            const selected = () => state.isSelected(col.id)
            return (
              <button
                type="button"
                onClick={() => state.handleCollectionClick(col.id)}
                class={`flex w-full items-center justify-between p-3.5 text-left transition-colors ${
                  selected() ? "bg-blue-50/80 dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <svg class="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d={vaultSvgIcons.sharedVault} />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-slate-900 text-sm dark:text-slate-100">{col.name}</p>
                    <Show when={col.externalId}>
                      <p class="truncate font-mono text-[11px] text-slate-600 dark:text-slate-400">{col.externalId}</p>
                    </Show>
                  </div>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1 pl-2">
                  <Badge variant="subtle" class="text-[10px] px-1.5 py-0">
                    {col.users?.length ?? 0} members
                  </Badge>
                </div>
              </button>
            )
          }}
        </For>
      </div>
    </div>
  )
}
