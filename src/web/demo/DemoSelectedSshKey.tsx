import type { JSX } from "solid-js"
import { DemoSelectedVaultItem } from "./DemoSelectedVaultItem.jsx"
import { demoSelectedSshKeyStateCreate } from "./demoSelectedSshKeyStateCreate.js"

export function DemoSelectedSshKey(): JSX.Element {
  const state = demoSelectedSshKeyStateCreate()

  return <DemoSelectedVaultItem currentDemo="ssh-key" title="Selected SSH Key" selected={state} />
}
