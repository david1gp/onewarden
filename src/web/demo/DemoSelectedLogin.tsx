import type { JSX } from "solid-js"
import { DemoSelectedVaultItem } from "./DemoSelectedVaultItem.jsx"
import { demoSelectedLoginStateCreate } from "./demoSelectedLoginStateCreate.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import type { VaultDemoHeaderProps } from "./vaultDemoHeaderStateCreate.js"

export function DemoSelectedLogin(props: Pick<VaultDemoHeaderProps, "navigate"> = {}): JSX.Element {
  const state = demoSelectedLoginStateCreate()

  return (
    <DemoSelectedVaultItem
      currentDemo={pageNameDemo.login}
      title="Selected Login Credential"
      selected={state}
      navigate={props.navigate}
    />
  )
}
