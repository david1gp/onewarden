import { vaultSortCompare } from "../../../shared/vault/vaultSortCompare.js"
import type { VaultSort } from "../../../shared/vault/vaultSortSchema.js"
import type { VaultItem } from "./vaultItemSchema.js"
import { vaultItemSortItemCreate } from "./vaultItemSortItemCreate.js"

/** Sorts vault items with the shared deterministic comparison. */
export function vaultItemsSortApply(items: readonly VaultItem[], sort: VaultSort): VaultItem[] {
  return [...items].sort((left, right) =>
    vaultSortCompare(sort, vaultItemSortItemCreate(left), vaultItemSortItemCreate(right)),
  )
}
