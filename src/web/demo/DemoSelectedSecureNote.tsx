import type { JSX } from "solid-js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { demoSelectedSecureNoteStateCreate } from "./demoSelectedSecureNoteStateCreate.js"

export function DemoSelectedSecureNote(): JSX.Element {
  const state = demoSelectedSecureNoteStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo="secure-note" title="Selected Secure Note" />
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
