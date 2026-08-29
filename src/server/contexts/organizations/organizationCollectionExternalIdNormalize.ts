export function organizationCollectionExternalIdNormalize(
  externalId: string | null | undefined,
  trimWhitespace = false,
): string | null {
  if (externalId === undefined || externalId === null) return null
  if (trimWhitespace ? externalId.trim().length === 0 : externalId.length === 0) return null
  return externalId
}
