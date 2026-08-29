import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AdminBackupCardProps, adminBackupCardStateCreate } from "./adminBackupCardStateCreate.js"

export function AdminBackupCard(props: AdminBackupCardProps): JSX.Element {
  const state = adminBackupCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <Icon path={vaultSvgIcons.download} class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">Database Backup</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Create an instantaneous snapshot of the SQLite database
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="filled"
          size="sm"
          class="text-xs"
          onClick={state.handleCreateBackup}
          disabled={state.isBackingUp()}
        >
          <Icon path={vaultSvgIcons.download} class="mr-1 size-3.5" />
          {state.isBackingUp() ? "Backing up..." : "Backup Database"}
        </Button>
      </div>

      <Show when={state.lastBackupResult()}>
        {(msg) => (
          <div class="mt-4 rounded-lg bg-purple-50 p-3 font-mono text-xs text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
            {msg()}
          </div>
        )}
      </Show>
    </CardWrapper>
  )
}
