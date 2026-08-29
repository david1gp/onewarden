import type { JSX } from "solid-js"
import { DemoSelectedVaultItem } from "./DemoSelectedVaultItem.jsx"
import { demoSelectedSecureNoteStateCreate } from "./demoSelectedSecureNoteStateCreate.js"

export function DemoSelectedSecureNote(): JSX.Element {
  const state = demoSelectedSecureNoteStateCreate()

  return <DemoSelectedVaultItem currentDemo="secure-note" title="Selected Secure Note" selected={state} />
}
