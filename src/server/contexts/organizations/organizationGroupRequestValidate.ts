import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq, inArray } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { OrganizationGroupRequestData } from "./organizationGroupRequestDataSchema.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"

export function organizationGroupRequestValidate(
  database: DatabaseConnection,
  organizationUuid: string,
  data: OrganizationGroupRequestData,
): Result<void> {
  const op = "organizationGroupRequestValidate"
  const collectionIds = [...new Set(data.collections.map((collection) => collection.id))]
  if (collectionIds.length > 0) {
    try {
      const rows = database.drizzle
        .select({ uuid: collections.uuid })
        .from(collections)
        .where(and(eq(collections.orgUuid, organizationUuid), inArray(collections.uuid, collectionIds)))
        .all()
      const existingIds = new Set(rows.map((row) => row.uuid))
      const invalidId = collectionIds.find((collectionId) => !existingIds.has(collectionId))
      if (invalidId !== undefined)
        return organizationErrorCreate(op, `Invalid collection ${invalidId} for organization ${organizationUuid}`)
    } catch {
      return resultErrorCreate(op, "Organization collection lookup failed.")
    }
  }

  const memberIds = [...new Set(data.users)]
  if (memberIds.length > 0) {
    try {
      const rows = database.drizzle
        .select({ uuid: usersOrganizations.uuid })
        .from(usersOrganizations)
        .where(and(eq(usersOrganizations.orgUuid, organizationUuid), inArray(usersOrganizations.uuid, memberIds)))
        .all()
      const existingIds = new Set(rows.map((row) => row.uuid))
      const invalidId = memberIds.find((memberId) => !existingIds.has(memberId))
      if (invalidId !== undefined)
        return organizationErrorCreate(op, `Invalid member ${invalidId} for organization ${organizationUuid}`)
    } catch {
      return resultErrorCreate(op, "Organization membership lookup failed.")
    }
  }

  return resultCreate(undefined)
}
