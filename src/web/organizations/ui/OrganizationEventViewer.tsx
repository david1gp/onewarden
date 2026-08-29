import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationEventViewerProps,
  organizationEventViewerStateCreate,
} from "./organizationEventViewerStateCreate.js"

export function OrganizationEventViewer(props: OrganizationEventViewerProps): JSX.Element {
  const state = organizationEventViewerStateCreate(props)

  return (
    <div class="flex h-full flex-col overflow-y-auto bg-slate-50 p-6 dark:bg-slate-900">
      {/* Header */}
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-bold text-slate-900 text-xl dark:text-slate-100">Event & Audit Logs</h2>
          <p class="mt-1 text-slate-500 text-xs dark:text-slate-400">
            Real-time security and operational events logged across your organization.
          </p>
        </div>
        <Show when={state.onRefresh}>
          <Button variant="outline" size="sm" onClick={state.onRefresh} disabled={state.isLoading()}>
            {state.isLoading() ? "Refreshing..." : "Refresh Events"}
          </Button>
        </Show>
      </div>

      {/* Filters Bar */}
      <div class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
        <div class="relative flex-1 min-w-[200px]">
          <Icon
            path={vaultSvgIcons.search}
            class="pointer-events-none absolute left-2.5 size-3.5 text-slate-400 dark:text-slate-500"
          />
          <Input
            type="search"
            placeholder="Search events, actors, IP addresses..."
            value={state.searchQuery()}
            onInput={(e) => state.handleSearchChange(e.currentTarget.value)}
            class="h-8 w-full rounded-md border-slate-200 bg-slate-50 pl-8 pr-3 text-xs placeholder:text-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900"
          />
        </div>

        {/* Member Selector Filter */}
        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-slate-500 dark:text-slate-400">Member:</span>
          <select
            aria-label="Filter events by member"
            value={state.selectedMemberFilter()}
            onChange={state.handleMemberFilterChange}
            class="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Members</option>
            <For each={state.members()}>{(m) => <option value={m.userId || m.id}>{m.name || m.email}</option>}</For>
          </select>
        </div>
      </div>

      {/* Events Table / List */}
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <section class="overflow-x-auto" tabindex="0" aria-label="Scrollable event log table">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
              <tr>
                <th class="px-4 py-3">Event Type</th>
                <th class="px-4 py-3">Actor / Member</th>
                <th class="px-4 py-3">Client / Device</th>
                <th class="px-4 py-3">IP Address</th>
                <th class="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <For
                each={state.filteredEvents()}
                fallback={
                  <tr>
                    <td colspan="5" class="px-4 py-8 text-center text-slate-400">
                      No events found.
                    </td>
                  </tr>
                }
              >
                {(event) => (
                  <tr class="hover:bg-slate-50/75 dark:hover:bg-slate-800/40">
                    <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      <div class="flex items-center gap-2">
                        <Badge variant="subtle" class="px-1.5 py-0 font-mono text-[10px]">
                          {event.type}
                        </Badge>
                        <span>{state.getEventName(event.type)}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {state.resolveMemberName(event.actingUserId || event.userId || event.organizationUserId)}
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {state.resolveDeviceName(event.deviceType)}
                    </td>
                    <td class="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{event.ipAddress || "—"}</td>
                    <td class="px-4 py-3 text-slate-500 dark:text-slate-400">{state.formatEventDate(event.date)}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </section>

        {/* Pagination / Continuation */}
        <Show when={state.continuationToken() && state.onLoadMore}>
          <div class="border-t border-slate-100 p-3 text-center dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={state.onLoadMore} disabled={state.isLoading()}>
              {state.isLoading() ? "Loading more..." : "Load Older Events"}
            </Button>
          </div>
        </Show>
      </div>
    </div>
  )
}
