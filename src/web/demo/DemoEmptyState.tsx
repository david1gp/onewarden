import type { JSX } from "solid-js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { demoEmptyStateCreate } from "./demoEmptyStateCreate.js"

export function DemoEmptyState(): JSX.Element {
  const state = demoEmptyStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo="empty-state" title="Empty Vault State" />
      <div class="flex-1 overflow-hidden">
        <VaultWorkspace initialItems={state.items} />
      </div>
    </div>
  )
}
