import { vaultDemoData } from "./vaultDemoData.js"
import type { VaultItem } from "./vaultItemSchema.js"

type DemoSelectedCategory = Extract<VaultItem["category"], "login" | "secureNote" | "creditCard" | "identity">

type DemoSelectedState<Category extends DemoSelectedCategory> = {
  items: typeof vaultDemoData
  defaultCategory: Category
  defaultSelectedId: string
}

export function demoSelectedStateCreate<Category extends DemoSelectedCategory>(
  defaultCategory: Category,
  defaultSelectedId: string,
): DemoSelectedState<Category> {
  return {
    items: vaultDemoData,
    defaultCategory,
    defaultSelectedId,
  }
}
