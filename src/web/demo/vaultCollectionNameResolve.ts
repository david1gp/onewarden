const collectionNames: Record<string, string> = {
  "collection-engineering": "Engineering",
  "collection-infrastructure": "Infrastructure",
  "collection-finance": "Finance",
  "collection-family": "Family",
  "collection-identity": "Identity",
}

export function vaultCollectionNameResolve(collectionId: string): string {
  return collectionNames[collectionId] ?? collectionId
}
