import type { JSX } from "solid-js"
import { ExtensionPopupView } from "./ExtensionPopupView.jsx"
import { type ExtensionPopupAppOptions, extensionPopupAppStateCreate } from "./extensionPopupAppStateCreate.js"

export interface ExtensionPopupAppProps {
  options?: ExtensionPopupAppOptions
}

export function ExtensionPopupApp(props: ExtensionPopupAppProps): JSX.Element {
  const state = extensionPopupAppStateCreate(props.options)
  return <ExtensionPopupView model={state.model()} commands={state.commands} />
}
