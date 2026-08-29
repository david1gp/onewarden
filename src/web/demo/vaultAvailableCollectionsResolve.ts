export interface VaultDemoCollectionOption {
  id: string
  name: string
}

const availableCollections: readonly VaultDemoCollectionOption[] = [
  { id: "collection-engineering", name: "Engineering" },
  { id: "collection-infrastructure", name: "Infrastructure" },
  { id: "collection-finance", name: "Finance" },
  { id: "collection-family", name: "Family" },
  { id: "collection-identity", name: "Identity" },
]

export function vaultAvailableCollectionsResolve(): readonly VaultDemoCollectionOption[] {
  return availableCollections
}
