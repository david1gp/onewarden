import type { JSX } from "solid-js"
import { ExtensionFullWindowView } from "./ExtensionFullWindowView.jsx"
import {
  type ExtensionFullWindowAppOptions,
  extensionFullWindowAppStateCreate,
} from "./extensionFullWindowAppStateCreate.js"

export interface ExtensionFullWindowAppProps {
  options?: ExtensionFullWindowAppOptions
}

export function ExtensionFullWindowApp(props: ExtensionFullWindowAppProps): JSX.Element {
  const state = extensionFullWindowAppStateCreate(props.options)
  return (
    <ExtensionFullWindowView
      model={state.model}
      commands={state.commands}
      generatorPreferences={state.generatorPreferences}
      generatorPreferencesLoaded={state.generatorPreferencesLoaded}
      onGeneratorPreferencesChange={state.onGeneratorPreferencesChange}
    />
  )
}
