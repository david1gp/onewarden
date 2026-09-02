import type { JSX } from "solid-js"
import { demoAllItemsStateCreate } from "./demoAllItemsStateCreate.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import type { VaultDemoHeaderProps } from "./vaultDemoHeaderStateCreate.js"
import { VaultWorkspace } from "./VaultWorkspace.jsx"

export function DemoAllItems(props: Pick<VaultDemoHeaderProps, "navigate"> = {}): JSX.Element {
  const state = demoAllItemsStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo={pageNameDemo.allItems} title="All Vault Items" navigate={props.navigate} />
      <main id="main-content" tabindex="-1" class="flex-1 overflow-hidden focus:outline-none">
        <VaultWorkspace items={() => state.items} defaultSelectedId={state.defaultSelectedId} />
      </main>
    </div>
  )
}
