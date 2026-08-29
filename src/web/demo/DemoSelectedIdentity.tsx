import type { JSX } from "solid-js"
import { DemoSelectedVaultItem } from "./DemoSelectedVaultItem.jsx"
import { demoSelectedIdentityStateCreate } from "./demoSelectedIdentityStateCreate.js"

export function DemoSelectedIdentity(): JSX.Element {
  const state = demoSelectedIdentityStateCreate()

  return <DemoSelectedVaultItem currentDemo="identity" title="Selected Identity Profile" selected={state} />
}
