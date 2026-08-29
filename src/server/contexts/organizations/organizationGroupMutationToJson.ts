import type { OrganizationGroup } from "./organizationGroup.js"

export function organizationGroupMutationToJson(group: OrganizationGroup): Record<string, unknown> {
  return {
    accessAll: group.accessAll,
    externalId: group.externalId,
    id: group.uuid,
    name: group.name,
    object: "group",
    organizationId: group.organizationUuid,
  }
}
