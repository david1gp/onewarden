import { render } from "solid-js/web"
import { extensionThemeInit } from "../theme/extensionThemeInit.js"
import { ExtensionPasskeyConsentApp } from "./ExtensionPasskeyConsentApp.jsx"
import "../extensionStyles.css"

const root = document.getElementById("root")
if (!root) throw new Error("extensionPasskeyConsentMount could not find the #root element")

void extensionThemeInit().then(() => render(() => <ExtensionPasskeyConsentApp />, root))
