import type { JSX } from "solid-js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { demoAllItemsStateCreate } from "./demoAllItemsStateCreate.js"

export function DemoAllItems(): JSX.Element {
  const state = demoAllItemsStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo="all-items" title="All Vault Items" />
      <main id="main-content" tabindex="-1" class="flex-1 overflow-hidden focus:outline-none">
        <VaultWorkspace initialItems={state.items} defaultSelectedId={state.defaultSelectedId} />
      </main>
    </div>
  )
}
