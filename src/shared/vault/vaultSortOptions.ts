import type { VaultSort } from "./vaultSortSchema.js"

export const vaultSortOptions: readonly { value: VaultSort; label: string }[] = [
  { value: "name-az", label: "Name A–Z" },
  { value: "name-za", label: "Name Z–A" },
  { value: "created-newest", label: "Created newest" },
  { value: "created-oldest", label: "Created oldest" },
  { value: "updated-newest", label: "Updated newest" },
  { value: "updated-oldest", label: "Updated oldest" },
]
