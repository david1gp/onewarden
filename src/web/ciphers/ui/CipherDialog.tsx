import type { JSX } from "solid-js"
import { CipherDialogView } from "./CipherDialogView.jsx"
import { type CipherDialogStateProps, cipherDialogStateCreate } from "./cipherDialogStateCreate.js"

export function CipherDialog(props: CipherDialogStateProps): JSX.Element {
  const state = cipherDialogStateCreate(props)

  return <CipherDialogView state={state} />
}
