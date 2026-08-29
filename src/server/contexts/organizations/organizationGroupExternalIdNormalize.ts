export function organizationGroupExternalIdNormalize(externalId: string | null | undefined): string | null {
  if (externalId === null || externalId === undefined || externalId.trim().length === 0) return null
  return externalId
}
