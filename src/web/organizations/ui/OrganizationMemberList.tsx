import { For, type JSX, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { ButtonIcon1 } from "#ui/interactive/button/ButtonIcon1.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationMemberListProps,
  organizationMemberListStateCreate,
} from "./organizationMemberListStateCreate.js"

export function OrganizationMemberList(props: OrganizationMemberListProps): JSX.Element {
  const state = organizationMemberListStateCreate(props)

  return (
    <div class="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Header & Search */}
      <div class="border-b border-slate-200 p-3 dark:border-slate-800">
        <div class="flex items-center justify-between gap-2">
          <span class="font-bold text-slate-900 text-sm dark:text-slate-100">
            Members ({state.filteredMembers().length})
          </span>
          <ButtonIcon1
            variant="filled"
            size="sm"
            icon={vaultSvgIcons.plus}
            onClick={state.onInviteClick}
            class="h-7 gap-1 px-2 text-xs"
            iconClass="size-3.5 mr-1"
            aria-label="Invite members"
          >
            <span>Invite</span>
          </ButtonIcon1>
        </div>
        <div class="relative mt-2.5 flex items-center">
          <Icon
            path={vaultSvgIcons.search}
            class="pointer-events-none absolute left-2.5 size-3.5 text-slate-400 dark:text-slate-500"
          />
          <Input
            type="search"
            placeholder="Search members..."
            value={state.searchQuery()}
            onInput={(e) => state.handleSearchChange(e.currentTarget.value)}
            class="h-8 w-full rounded-md border-slate-200 bg-slate-50 pl-8 pr-3 text-xs placeholder:text-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900"
          />
        </div>
      </div>

      {/* Member Items List */}
      <div class="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        <For
          each={state.filteredMembers()}
          fallback={
            <div class="p-6 text-center text-slate-400 text-xs">
              <p>No members found.</p>
            </div>
          }
        >
          {(mem) => {
            const selected = () => state.isSelected(mem.id)
            const statusInfo = () => state.resolveMemberStatus(mem.status)
            return (
              <button
                type="button"
                onClick={() => state.handleMemberClick(mem.id)}
                class={`flex w-full items-center justify-between p-3.5 text-left transition-colors ${
                  selected() ? "bg-blue-50/80 dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-xs dark:bg-slate-800 dark:text-slate-300">
                    {mem.name ? mem.name.charAt(0).toUpperCase() : mem.email.charAt(0).toUpperCase()}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-slate-900 text-sm dark:text-slate-100">
                      {mem.name || mem.email}
                    </p>
                    <Show when={mem.name}>
                      <p class="truncate text-slate-600 text-xs dark:text-slate-400">{mem.email}</p>
                    </Show>
                  </div>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1 pl-2">
                  <Badge variant={statusInfo().variant} class="text-[10px] px-1.5 py-0">
                    {statusInfo().label}
                  </Badge>
                  <span class="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    {state.resolveMemberRole(mem.type)}
                  </span>
                </div>
              </button>
            )
          }}
        </For>
      </div>
    </div>
  )
}
