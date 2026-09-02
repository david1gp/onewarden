import type { JSX } from "solid-js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { vaultAvailableCollectionsResolve } from "./vaultAvailableCollectionsResolve.js"
import type { VaultItem } from "./vaultItemSchema.js"
import type { VaultDemoHeaderProps } from "./vaultDemoHeaderStateCreate.js"
import type { PageNameDemo } from "./demo_url/pageNameDemo.js"

type DemoSelectedVaultItemProps = {
  currentDemo: PageNameDemo
  title: string
  navigate?: VaultDemoHeaderProps["navigate"]
  selected: {
    items: readonly VaultItem[]
    defaultCategory: string
    defaultSelectedId: string
  }
}

export function DemoSelectedVaultItem(props: DemoSelectedVaultItemProps): JSX.Element {
  return (
    <div class="flex h-dvh min-h-0 w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo={props.currentDemo} title={props.title} navigate={props.navigate} />
      <main id="main-content" tabindex="-1" class="min-h-0 flex-1 overflow-hidden focus:outline-none">
        <VaultWorkspace
          items={() => props.selected.items}
          collections={vaultAvailableCollectionsResolve}
          defaultCategory={props.selected.defaultCategory}
          defaultSelectedId={props.selected.defaultSelectedId}
        />
      </main>
    </div>
  )
}
