import type { JSX } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { demoTrashStateCreate } from "./demoTrashStateCreate.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { vaultSvgIcons } from "./vaultSvgIcons.js"
import type { VaultDemoHeaderProps } from "./vaultDemoHeaderStateCreate.js"

export function DemoTrash(props: Pick<VaultDemoHeaderProps, "navigate"> = {}): JSX.Element {
  const state = demoTrashStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo={pageNameDemo.trash} title="Trash & Deleted Items" navigate={props.navigate} />
      <section
        aria-label="Trash archive notice"
        class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
      >
        <Icon path={vaultSvgIcons.trash} class="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          <strong>Trash Archive:</strong> Items in trash are scheduled for permanent purge after 30 days. No modal
          dialogs required for inspection.
        </span>
      </section>
      <main id="main-content" tabindex="-1" class="flex flex-1 flex-col overflow-hidden focus:outline-none">
        <div class="flex-1 overflow-hidden">
          <VaultWorkspace
            items={() => state.allItems}
            defaultCategory="trash"
            defaultSelectedId={state.defaultSelectedId}
            onRestoreItem={state.restoreItem}
            onPermanentlyDeleteItem={state.permanentlyDeleteItem}
          />
        </div>
      </main>
    </div>
  )
}
