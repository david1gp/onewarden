import { vaultDemoData } from "./vaultDemoData.js"

export function demoSelectedSecureNoteStateCreate() {
  return {
    items: vaultDemoData,
    defaultCategory: "secureNote",
    defaultSelectedId: "item-wifi-office",
  }
}
