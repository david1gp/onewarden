import type { JSX } from "solid-js"
import { DemoSelectedVaultItem } from "./DemoSelectedVaultItem.jsx"
import { demoSelectedIdentityStateCreate } from "./demoSelectedIdentityStateCreate.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import type { VaultDemoHeaderProps } from "./vaultDemoHeaderStateCreate.js"

export function DemoSelectedIdentity(props: Pick<VaultDemoHeaderProps, "navigate"> = {}): JSX.Element {
  const state = demoSelectedIdentityStateCreate()

  return (
    <DemoSelectedVaultItem
      currentDemo={pageNameDemo.identity}
      title="Selected Identity Profile"
      selected={state}
      navigate={props.navigate}
    />
  )
}
