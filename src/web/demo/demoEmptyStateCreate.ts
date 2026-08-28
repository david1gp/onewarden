import type { VaultItem } from "./vaultItemSchema.js"

export function demoEmptyStateCreate() {
  const emptyItems: readonly VaultItem[] = []
  return {
    items: emptyItems,
  }
}
