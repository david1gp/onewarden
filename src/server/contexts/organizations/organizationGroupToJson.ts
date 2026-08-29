import type { OrganizationGroup } from "./organizationGroup.js"

export function organizationGroupToJson(group: OrganizationGroup): Record<string, unknown> {
  return {
    externalId: group.externalId,
    id: group.uuid,
    name: group.name,
    object: "group",
    organizationId: group.organizationUuid,
  }
}
