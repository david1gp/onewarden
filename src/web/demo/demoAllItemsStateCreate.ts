import { vaultDemoStore } from "./vaultDemoStore.js"

export function demoAllItemsStateCreate() {
  return {
    get items() {
      return vaultDemoStore.activeItems()
    },
    defaultSelectedId: "item-github-enterprise",
  }
}
