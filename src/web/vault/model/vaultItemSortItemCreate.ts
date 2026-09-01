import type { VaultSortItem } from "../../../shared/vault/vaultSortItem.js"
import type { VaultItem } from "./vaultItemSchema.js"

/** Projects a vault item onto the shared sort item shape. */
export function vaultItemSortItemCreate(item: VaultItem): VaultSortItem {
  return {
    id: item.id,
    name: item.title,
    creationDate: item.createdAt,
    revisionDate: item.updatedAt,
  }
}
