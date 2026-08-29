import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
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
    const placeholders = collectionIds.map(() => "?").join(", ")
    try {
      const rows = database
        .query<{ uuid: string }, string[]>(
          `SELECT uuid FROM collections
           WHERE org_uuid = ? AND uuid IN (${placeholders})`,
        )
        .all(organizationUuid, ...collectionIds)
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
    const placeholders = memberIds.map(() => "?").join(", ")
    try {
      const rows = database
        .query<{ uuid: string }, string[]>(
          `SELECT uuid FROM users_organizations
           WHERE org_uuid = ? AND uuid IN (${placeholders})`,
        )
        .all(organizationUuid, ...memberIds)
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
