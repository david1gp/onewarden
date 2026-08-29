import type { JSX } from "solid-js"
import { DemoSelectedVaultItem } from "./DemoSelectedVaultItem.jsx"
import { demoSelectedLoginStateCreate } from "./demoSelectedLoginStateCreate.js"

export function DemoSelectedLogin(): JSX.Element {
  const state = demoSelectedLoginStateCreate()

  return <DemoSelectedVaultItem currentDemo="login" title="Selected Login Credential" selected={state} />
}
