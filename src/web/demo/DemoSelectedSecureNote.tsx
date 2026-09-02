import type { JSX } from "solid-js"
import { DemoSelectedVaultItem } from "./DemoSelectedVaultItem.jsx"
import { demoSelectedSecureNoteStateCreate } from "./demoSelectedSecureNoteStateCreate.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import type { VaultDemoHeaderProps } from "./vaultDemoHeaderStateCreate.js"

export function DemoSelectedSecureNote(props: Pick<VaultDemoHeaderProps, "navigate"> = {}): JSX.Element {
  const state = demoSelectedSecureNoteStateCreate()

  return (
    <DemoSelectedVaultItem
      currentDemo={pageNameDemo.secureNote}
      title="Selected Secure Note"
      selected={state}
      navigate={props.navigate}
    />
  )
}
