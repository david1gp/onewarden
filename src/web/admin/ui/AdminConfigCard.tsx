import { type JSX } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AdminConfigCardProps, adminConfigCardStateCreate } from "./adminConfigCardStateCreate.js"

export function AdminConfigCard(props: AdminConfigCardProps): JSX.Element {
  const state = adminConfigCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <Icon path={vaultSvgIcons.cog} class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">Server Configuration</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Inspect and update runtime server settings and feature toggles
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-sm"
            onClick={state.loadConfig}
            disabled={state.isLoading()}
          >
            <Icon path={vaultSvgIcons.refresh} class="mr-1 size-3.5" />
            Reload
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-sm text-red-600 dark:text-red-400"
            onClick={state.handleDeleteConfig}
            disabled={state.isDeleting()}
          >
            Reset Overrides
          </Button>
        </div>
      </div>

      <form onSubmit={state.handleSaveConfig} class="mt-6 space-y-4">
        <div>
          <label for="admin-config-json" class="block font-medium text-sm text-slate-700 dark:text-slate-300">
            Configuration (JSON Editor)
          </label>
          <Textarea
            id="admin-config-json"
            rows={12}
            value={state.configJsonInput()}
            onInput={(e) => state.setConfigJsonInput(e.currentTarget.value)}
            class="mt-1 font-mono text-sm"
          />
        </div>

        <div class="flex items-center justify-end">
          <Button
            type="submit"
            variant="filled"
            size="sm"
            class="text-sm"
            disabled={state.isSaving() || state.isLoading()}
          >
            {state.isSaving() ? "Saving Configuration..." : "Save Configuration"}
          </Button>
        </div>
      </form>
    </CardWrapper>
  )
}
