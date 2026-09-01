import type { OrganizationGroup } from "./organizationGroup.js"
import type { GroupRow } from "../../database/schema/groups.js"

export function organizationGroupFromRow(row: GroupRow): OrganizationGroup {
  return {
    accessAll: row.accessAll,
    createdAt: row.creationDate,
    externalId: row.externalId,
    name: row.name,
    organizationUuid: row.organizationsUuid,
    revisionDate: row.revisionDate,
    uuid: row.uuid,
  }
}
