import { vaultDemoData } from "./vaultDemoData.js"

export function demoSelectedLoginStateCreate() {
  return {
    items: vaultDemoData,
    defaultCategory: "login",
    defaultSelectedId: "item-github-enterprise",
  }
}
