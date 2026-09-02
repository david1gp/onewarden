import type { JSX } from "solid-js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { demoEmptyStateCreate } from "./demoEmptyStateCreate.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import type { VaultDemoHeaderProps } from "./vaultDemoHeaderStateCreate.js"

export function DemoEmptyState(props: Pick<VaultDemoHeaderProps, "navigate"> = {}): JSX.Element {
  const state = demoEmptyStateCreate()

  return (
    <div class="flex h-full min-h-dvh w-full flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      <VaultDemoHeader currentDemo={pageNameDemo.emptyState} title="Empty Vault State" navigate={props.navigate} />
      <main id="main-content" tabindex="-1" class="flex-1 overflow-hidden focus:outline-none">
        <VaultWorkspace initialItems={state.items} />
      </main>
    </div>
  )
}
