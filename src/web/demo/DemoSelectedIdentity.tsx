import type { JSX } from "solid-js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { demoSelectedIdentityStateCreate } from "./demoSelectedIdentityStateCreate.js"

export function DemoSelectedIdentity(): JSX.Element {
  const state = demoSelectedIdentityStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo="identity" title="Selected Identity Profile" />
      <div class="flex-1 overflow-hidden">
        <VaultWorkspace
          initialItems={state.items}
          defaultCategory={state.defaultCategory}
          defaultSelectedId={state.defaultSelectedId}
        />
      </div>
    </div>
  )
}
