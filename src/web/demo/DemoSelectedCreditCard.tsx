import type { JSX } from "solid-js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import { demoSelectedCreditCardStateCreate } from "./demoSelectedCreditCardStateCreate.js"

export function DemoSelectedCreditCard(): JSX.Element {
  const state = demoSelectedCreditCardStateCreate()

  return (
    <div class="flex h-full w-full flex-col overflow-hidden">
      <VaultDemoHeader currentDemo="credit-card" title="Selected Credit Card" />
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
