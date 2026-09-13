import type { JSX } from "solid-js"
import { CipherPageView } from "./CipherPageView.jsx"
import { type CipherPageStateProps, cipherPageStateCreate } from "./cipherPageStateCreate.js"

export function CipherPage(props: CipherPageStateProps): JSX.Element {
  const state = cipherPageStateCreate(props)

  return <CipherPageView state={state} defaultUri={props.defaultUri} onNavigateBack={props.onNavigateBack} />
}
