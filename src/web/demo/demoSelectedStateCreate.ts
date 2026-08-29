import { vaultDemoStore } from "./vaultDemoStore.js"
import type { VaultItem } from "./vaultItemSchema.js"

type DemoSelectedCategory = Extract<
  VaultItem["category"],
  "login" | "secureNote" | "creditCard" | "identity" | "sshKey"
>

type DemoSelectedState<Category extends DemoSelectedCategory> = {
  items: readonly VaultItem[]
  defaultCategory: Category
  defaultSelectedId: string
}

export function demoSelectedStateCreate<Category extends DemoSelectedCategory>(
  defaultCategory: Category,
  defaultSelectedId: string,
): DemoSelectedState<Category> {
  return {
    get items() {
      return vaultDemoStore.activeItems()
    },
    defaultCategory,
    defaultSelectedId,
  }
}
