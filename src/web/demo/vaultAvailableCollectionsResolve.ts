import type { VaultCollection } from "../vault/model/vaultCollectionSchema.js"

const availableCollections: readonly VaultCollection[] = [
  { id: "collection-engineering", organizationId: "organization-acme", name: "Engineering" },
  { id: "collection-infrastructure", organizationId: "organization-acme", name: "Infrastructure" },
  { id: "collection-finance", organizationId: "organization-acme", name: "Finance" },
  { id: "collection-family", organizationId: "organization-acme", name: "Family" },
  { id: "collection-identity", organizationId: "organization-acme", name: "Identity" },
]

export function vaultAvailableCollectionsResolve(): readonly VaultCollection[] {
  return availableCollections
}
