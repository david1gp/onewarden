import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Details } from "#ui/interactive/details/Details.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../demo/vaultSvgIcons.js"
import type { AdminShellState } from "./AdminShellState.js"
import { AdminStatusBadge } from "./AdminStatusBadge.jsx"
import type { AdminDiagnostics } from "./adminDiagnosticsSchema.js"

type AdminDiagnosticCheck = AdminDiagnostics["checks"][number]
type AdminDiagnosticItem = NonNullable<AdminDiagnosticCheck["items"]>[number]

function DiagnosticItems(p: { items: AdminDiagnosticItem[] | undefined }) {
  return (
    <dl class="grid gap-3 sm:grid-cols-2">
      <For each={p.items ?? []}>
        {(item) => (
          <div class="min-w-0">
            <dt class="text-sm text-slate-500 dark:text-slate-400">{item.label}</dt>
            <dd class="mt-1 flex min-w-0 items-start justify-between gap-2 break-words font-medium">
              <span class="whitespace-pre-wrap break-words">{item.value}</span>
              <Show when={item.status}>
                <AdminStatusBadge status={item.status!} />
              </Show>
            </dd>
          </div>
        )}
      </For>
    </dl>
  )
}

function DiagnosticCheck(p: { check: AdminDiagnosticCheck }) {
  return (
    <Details
      summaryEl={
        <div class="flex min-w-0 flex-1 items-start justify-between gap-3 pr-3">
          <span class="min-w-0">
            <span class="block font-semibold">{p.check.label}</span>
            <span class="block text-sm text-slate-600 dark:text-slate-400">{p.check.summary}</span>
          </span>
          <AdminStatusBadge status={p.check.status} />
        </div>
      }
    >
      <Show
        when={p.check.items?.length || p.check.detail}
        fallback={
          <p class="border-t border-slate-200 p-6 text-sm dark:border-slate-700">
            No additional details are available.
          </p>
        }
      >
        <div class="space-y-4 border-t border-slate-200 p-6 dark:border-slate-700">
          <DiagnosticItems items={p.check.items} />
          <Show when={p.check.detail}>
            <p class="border-t border-slate-200 pt-4 text-sm dark:border-slate-700">{p.check.detail}</p>
          </Show>
        </div>
      </Show>
    </Details>
  )
}

export function AdminDiagnosticsView(p: { state: AdminShellState }) {
  return (
    <section aria-labelledby="admin-diagnostics-title">
      <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="admin-diagnostics-title" class="text-2xl font-bold">
            Diagnostics
          </h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Server runtime, network checks, and support information.
          </p>
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
        <For each={p.state.diagnostics().checks}>{(check) => <DiagnosticCheck check={check} />}</For>
      </div>
      <CardWrapper class="mt-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="font-semibold">Support information</h3>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Generate a reviewable report with diagnostics and the current configuration.
            </p>
          </div>
          <Button variant="filledBlue" size="sm" onClick={p.state.generateSupportInformation}>
            <Icon path={vaultSvgIcons.file} class="mr-1.5 size-3.5" />
            Generate Support String
          </Button>
        </div>
        <Details
          class="mt-4"
          summaryEl={
            <div class="flex min-w-0 flex-1 items-start justify-between gap-3 pr-3">
              <span>
                <span class="block font-semibold">Generated support information</span>
                <span class="block text-sm text-slate-600 dark:text-slate-400">
                  Includes redacted current configuration.
                </span>
              </span>
            </div>
          }
        >
          <Show
            when={p.state.supportInformation()}
            keyed
            fallback={
              <p class="border-t border-slate-200 p-6 text-sm dark:border-slate-700">Generate the report to view it.</p>
            }
          >
            {(supportInformation) => (
              <div class="space-y-4 border-t border-slate-200 p-6 dark:border-slate-700">
                <pre class="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 p-4 text-sm text-slate-100">
                  {supportInformation}
                </pre>
                <div class="flex justify-end">
                  <Button variant="outline" size="sm" onClick={p.state.copySupportInformation}>
                    <Icon path={vaultSvgIcons.copy} class="mr-1.5 size-3.5" />
                    Copy To Clipboard
                  </Button>
                </div>
              </div>
            )}
          </Show>
        </Details>
      </CardWrapper>
    </section>
  )
}
