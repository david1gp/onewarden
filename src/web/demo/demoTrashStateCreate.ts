import { vaultDemoStore } from "./vaultDemoStore.js"

export function demoTrashStateCreate() {
  return {
    get items() {
      return vaultDemoStore.deletedItems()
    },
    get allItems() {
      return vaultDemoStore.items()
    },
    defaultSelectedId: "item-trash-legacy-db",
    restoreItem: vaultDemoStore.restoreItem,
    permanentlyDeleteItem: vaultDemoStore.permanentlyDeleteItem,
  }
}
