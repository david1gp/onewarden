import type { OrganizationCollection } from "./organizationCollection.js"

export function organizationCollectionToJson(collection: OrganizationCollection) {
  return {
    defaultUserCollectionEmail: null,
    externalId: collection.externalId,
    id: collection.uuid,
    name: collection.name,
    object: "collection" as const,
    organizationId: collection.organizationUuid,
    type: 0,
  }
}
