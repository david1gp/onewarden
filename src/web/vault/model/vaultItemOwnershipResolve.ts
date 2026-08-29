import type { VaultItem } from "./vaultItemSchema.js"

export function vaultItemOwnershipResolve(
  item: Pick<VaultItem, "ownership" | "organizationId" | "vault">,
): "personal" | "organization" {
  if (item.ownership !== undefined) return item.ownership
  if (item.organizationId) return "organization"

  const vault = item.vault?.trim().toLowerCase()
  if (vault === undefined || vault === "" || vault === "personal" || vault === "my vault") return "personal"
  return "organization"
}
