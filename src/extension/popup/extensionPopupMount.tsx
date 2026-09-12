import { render } from "solid-js/web"
import { extensionStorageAdapterCreate } from "../storage/extensionStorageAdapterCreate.js"
import { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import { extensionThemeInit } from "../theme/extensionThemeInit.js"
import { ExtensionPopupApp } from "./ExtensionPopupApp.jsx"
import "../extensionStyles.css"

const root = document.getElementById("root")
if (!root) throw new Error("extensionPopupMount could not find the #root element")

const storage = extensionStorageCreate(extensionStorageAdapterCreate(chrome.storage))

void extensionThemeInit().then(() => render(() => <ExtensionPopupApp options={{ storage }} />, root))
