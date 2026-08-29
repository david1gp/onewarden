import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AdminDiagnosticsCardProps, adminDiagnosticsCardStateCreate } from "./adminDiagnosticsCardStateCreate.js"

export function AdminDiagnosticsCard(props: AdminDiagnosticsCardProps): JSX.Element {
  const state = adminDiagnosticsCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Icon path={vaultSvgIcons.shieldCheck} class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">System Diagnostics</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Server runtime status, database details, and environment capabilities
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="text-xs"
          onClick={state.loadDiagnostics}
          disabled={state.isLoading()}
        >
          <Icon path={vaultSvgIcons.refresh} class="mr-1 size-3.5" />
          Refresh
        </Button>
      </div>

      <div class="mt-6">
        <Show
          when={state.diagnostics()}
          fallback={
            <div class="py-12 text-center text-xs text-slate-500">
              {state.isLoading() ? "Loading diagnostic info..." : "Diagnostics unavailable."}
            </div>
          }
        >
          {(diagnostics) => (
            <div class="space-y-4 text-xs">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <span class="text-[11px] text-slate-500">Database Engine</span>
                  <p class="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                    {diagnostics().db_type ?? "Unknown"}
                  </p>
                </div>
                <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <span class="text-[11px] text-slate-500">Release</span>
                  <p class="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                    {diagnostics().current_release ?? "Unknown"}
                  </p>
                </div>
                <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <span class="text-[11px] text-slate-500">Web Vault</span>
                  <p class="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                    {diagnostics().web_vault_enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>

              <div class="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                <h3 class="mb-3 font-semibold text-xs text-slate-800 dark:text-slate-200">Runtime Details</h3>
                <div class="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] dark:border-slate-800 dark:bg-slate-950">
                  <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span class="text-slate-600 dark:text-slate-400">Database version</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-200">
                      {diagnostics().db_version ?? "Unknown"}
                    </span>
                  </div>
                  <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span class="text-slate-600 dark:text-slate-400">Server time</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-200">
                      {diagnostics().server_time ?? "Unknown"}
                    </span>
                  </div>
                  <div class="flex justify-between py-1">
                    <span class="text-slate-600 dark:text-slate-400">Proxy detected</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-200">
                      {diagnostics().uses_proxy ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Show>
      </div>
    </CardWrapper>
  )
}
