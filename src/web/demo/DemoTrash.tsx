import type { JSX } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { demoTrashStateCreate } from "./demoTrashStateCreate.js"
import { vaultSvgIcons } from "./vaultSvgIcons.js"

export function DemoTrash(): JSX.Element {
  const state = demoTrashStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo="trash" title="Trash & Deleted Items" />
      <div class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <Icon path={vaultSvgIcons.trash} class="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          <strong>Trash Archive:</strong> Items in trash are scheduled for permanent purge after 30 days. No modal
          dialogs required for inspection.
        </span>
      </div>
      <div class="flex-1 overflow-hidden">
        <VaultWorkspace initialItems={state.items} defaultSelectedId={state.defaultSelectedId} />
      </div>
    </div>
  )
}
