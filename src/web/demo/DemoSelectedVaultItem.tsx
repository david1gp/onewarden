import type { JSX } from "solid-js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import type { VaultItem } from "./vaultItemSchema.js"

type DemoSelectedVaultItemProps = {
  currentDemo: string
  title: string
  selected: {
    items: readonly VaultItem[]
    defaultCategory: string
    defaultSelectedId: string
  }
}

export function DemoSelectedVaultItem(props: DemoSelectedVaultItemProps): JSX.Element {
  return (
    <div class="flex h-full w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo={props.currentDemo} title={props.title} />
      <main id="main-content" tabindex="-1" class="flex-1 overflow-hidden focus:outline-none">
        <VaultWorkspace
          initialItems={props.selected.items}
          defaultCategory={props.selected.defaultCategory}
          defaultSelectedId={props.selected.defaultSelectedId}
        />
      </main>
    </div>
  )
}
