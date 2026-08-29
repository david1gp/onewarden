import { For, Show } from "solid-js"
import { Details } from "#ui/interactive/details/Details.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { AdminShellState } from "./AdminShellState.js"
import { AdminStatusBadge } from "./AdminStatusBadge.jsx"

export function AdminDiagnosticsView(p: { state: AdminShellState }) {
  return (
    <section aria-labelledby="admin-diagnostics-title">
      <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="admin-diagnostics-title" class="text-2xl font-bold">
            Diagnostics
          </h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Deployment health and service configuration.</p>
        </div>
        <Badge variant="subtle">Checked {p.state.diagnostics().checkedAt}</Badge>
      </div>
      <CardWrapper class="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p class="text-sm text-slate-500">Version</p>
          <p class="font-semibold">{p.state.diagnostics().version}</p>
        </div>
        <div>
          <p class="text-sm text-slate-500">Environment</p>
          <p class="font-semibold">{p.state.diagnostics().environment}</p>
        </div>
      </CardWrapper>
      <div class="space-y-3">
        <For each={p.state.diagnostics().checks}>
          {(check) => (
            <Details
              summaryEl={
                <div class="flex min-w-0 flex-1 items-start justify-between gap-3 pr-3">
                  <span>
                    <span class="block font-semibold">{check.label}</span>
                    <span class="block text-sm text-slate-600 dark:text-slate-400">{check.summary}</span>
                  </span>
                  <AdminStatusBadge status={check.status} />
                </div>
              }
            >
              <div class="border-t border-slate-200 p-6 text-sm dark:border-slate-700">
                <Show when={check.detail} fallback="No additional details are available.">
                  {check.detail}
                </Show>
              </div>
            </Details>
          )}
        </For>
      </div>
    </section>
  )
}
