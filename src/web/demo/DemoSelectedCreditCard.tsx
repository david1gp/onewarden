import type { JSX } from "solid-js"
import { DemoSelectedVaultItem } from "./DemoSelectedVaultItem.jsx"
import { demoSelectedCreditCardStateCreate } from "./demoSelectedCreditCardStateCreate.js"

export function DemoSelectedCreditCard(): JSX.Element {
  const state = demoSelectedCreditCardStateCreate()

  return <DemoSelectedVaultItem currentDemo="credit-card" title="Selected Credit Card" selected={state} />
}
