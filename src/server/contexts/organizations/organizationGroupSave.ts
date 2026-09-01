import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { groups } from "../../database/schema/groups.js"
import type { OrganizationGroup } from "./organizationGroup.js"

export function organizationGroupSave(
  database: DatabaseConnection,
  group: OrganizationGroup,
  revisionDate: string,
): Result<void> {
  const op = "organizationGroupSave"
  try {
    database.drizzle
      .insert(groups)
      .values({
        uuid: group.uuid,
        organizationsUuid: group.organizationUuid,
        name: group.name,
        accessAll: group.accessAll,
        externalId: group.externalId,
        creationDate: group.createdAt,
        revisionDate,
      })
      .onConflictDoUpdate({
        target: groups.uuid,
        set: {
          organizationsUuid: group.organizationUuid,
          name: group.name,
          accessAll: group.accessAll,
          externalId: group.externalId,
          revisionDate,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Group save failed.")
  }
}
