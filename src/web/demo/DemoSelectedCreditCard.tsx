import type { JSX } from "solid-js"
import { DemoSelectedVaultItem } from "./DemoSelectedVaultItem.jsx"
import { demoSelectedCreditCardStateCreate } from "./demoSelectedCreditCardStateCreate.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import type { VaultDemoHeaderProps } from "./vaultDemoHeaderStateCreate.js"

export function DemoSelectedCreditCard(props: Pick<VaultDemoHeaderProps, "navigate"> = {}): JSX.Element {
  const state = demoSelectedCreditCardStateCreate()

  return (
    <DemoSelectedVaultItem
      currentDemo={pageNameDemo.creditCard}
      title="Selected Credit Card"
      selected={state}
      navigate={props.navigate}
    />
  )
}
