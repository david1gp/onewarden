import { vaultDemoData } from "./vaultDemoData.js"

export function demoSelectedCreditCardStateCreate() {
  return {
    items: vaultDemoData,
    defaultCategory: "creditCard",
    defaultSelectedId: "item-corporate-card",
  }
}
