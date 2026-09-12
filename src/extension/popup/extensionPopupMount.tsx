import { render } from "solid-js/web"
import { extensionThemeInit } from "../theme/extensionThemeInit.js"
import { ExtensionPopupApp } from "./ExtensionPopupApp.jsx"
import "../extensionStyles.css"

const root = document.getElementById("root")
if (!root) throw new Error("extensionPopupMount could not find the #root element")

void extensionThemeInit().then(() => render(() => <ExtensionPopupApp />, root))
