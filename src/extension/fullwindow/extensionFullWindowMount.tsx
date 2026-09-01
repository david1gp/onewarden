import { render } from "solid-js/web"
import { ExtensionFullWindowApp } from "./ExtensionFullWindowApp.jsx"
import { extensionStorageAdapterCreate } from "../storage/extensionStorageAdapterCreate.js"
import { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import "../extensionStyles.css"

const root = document.getElementById("root")
if (!root) throw new Error("extensionFullWindowMount could not find the #root element")

const storage = extensionStorageCreate(extensionStorageAdapterCreate(chrome.storage))

render(() => <ExtensionFullWindowApp options={{ storage }} />, root)
