import type { OrganizationGroup } from "./organizationGroup.js"
import type { OrganizationCollectionAccessData } from "./organizationCollectionAccessDataSchema.js"

export function organizationGroupDetailsToJson(
  group: OrganizationGroup,
  collections: readonly OrganizationCollectionAccessData[],
): Record<string, unknown> {
  return {
    accessAll: group.accessAll,
    collections: collections.map((collection) => ({
      hidePasswords: collection.hidePasswords,
      id: collection.id,
      manage: collection.manage || (!collection.readOnly && !collection.hidePasswords),
      readOnly: collection.readOnly,
    })),
    externalId: group.externalId,
    id: group.uuid,
    name: group.name,
    object: "groupDetails",
    organizationId: group.organizationUuid,
  }
}
