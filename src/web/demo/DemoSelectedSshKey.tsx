import type { JSX } from "solid-js"
import { DemoSelectedVaultItem } from "./DemoSelectedVaultItem.jsx"
import { demoSelectedSshKeyStateCreate } from "./demoSelectedSshKeyStateCreate.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import type { VaultDemoHeaderProps } from "./vaultDemoHeaderStateCreate.js"

export function DemoSelectedSshKey(props: Pick<VaultDemoHeaderProps, "navigate"> = {}): JSX.Element {
  const state = demoSelectedSshKeyStateCreate()

  return (
    <DemoSelectedVaultItem
      currentDemo={pageNameDemo.sshKey}
      title="Selected SSH Key"
      selected={state}
      navigate={props.navigate}
    />
  )
}
