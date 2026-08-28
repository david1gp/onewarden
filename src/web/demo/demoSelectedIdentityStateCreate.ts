import { vaultDemoData } from "./vaultDemoData.js"

export function demoSelectedIdentityStateCreate() {
  return {
    items: vaultDemoData,
    defaultCategory: "identity",
    defaultSelectedId: "item-identity-work",
  }
}
