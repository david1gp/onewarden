import { vaultDemoData } from "./vaultDemoData.js"

export function demoAllItemsStateCreate() {
  return {
    items: vaultDemoData,
    defaultSelectedId: "item-github-enterprise",
  }
}
