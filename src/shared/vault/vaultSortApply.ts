import { vaultSortCompare } from "./vaultSortCompare.js"
import type { VaultSortItem } from "./vaultSortItem.js"
import type { VaultSort } from "./vaultSortSchema.js"

export function vaultSortApply<T extends VaultSortItem>(items: readonly T[], sort: VaultSort): T[] {
  return [...items].sort((left, right) => vaultSortCompare(sort, left, right))
}
