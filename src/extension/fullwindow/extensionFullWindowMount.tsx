import { render } from "solid-js/web"
import { ExtensionFullWindowApp } from "./ExtensionFullWindowApp.jsx"
import "../extensionStyles.css"

const root = document.getElementById("root")
if (!root) throw new Error("extensionFullWindowMount could not find the #root element")

render(() => <ExtensionFullWindowApp />, root)
