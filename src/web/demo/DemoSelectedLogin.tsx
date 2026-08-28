import type { JSX } from "solid-js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { demoSelectedLoginStateCreate } from "./demoSelectedLoginStateCreate.js"

export function DemoSelectedLogin(): JSX.Element {
  const state = demoSelectedLoginStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo="login" title="Selected Login Credential" />
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
