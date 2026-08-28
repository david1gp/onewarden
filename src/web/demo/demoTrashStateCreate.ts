import { vaultTrashDemoData } from "./vaultTrashDemoData.js"

export function demoTrashStateCreate() {
  return {
    items: vaultTrashDemoData,
    defaultSelectedId: "item-trash-legacy-db",
  }
}
