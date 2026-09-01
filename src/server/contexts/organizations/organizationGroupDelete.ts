import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { and, eq } from "drizzle-orm"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import type { OrganizationGroup } from "./organizationGroup.js"
import { organizationCollectionRevisionUpdate } from "./organizationCollectionRevisionUpdate.js"
import { organizationGroupAffectedUserUuidsFind } from "./organizationGroupAffectedUserUuidsFind.js"

export function organizationGroupDelete(
  database: DatabaseConnection,
  group: OrganizationGroup,
  revisionDate: string,
): Result<void> {
  const affectedResult = organizationGroupAffectedUserUuidsFind(database, group.organizationUuid, group.uuid)
  if (!affectedResult.success) return affectedResult
  const result = databaseTransaction(database, () => {
    const op = "organizationGroupDelete"
    try {
      database.drizzle.delete(collectionsGroups).where(eq(collectionsGroups.groupsUuid, group.uuid)).run()
      database.drizzle.delete(groupsUsers).where(eq(groupsUsers.groupsUuid, group.uuid)).run()
      database.drizzle
        .delete(groups)
        .where(and(eq(groups.uuid, group.uuid), eq(groups.organizationsUuid, group.organizationUuid)))
        .run()
    } catch {
      return resultErrorCreate(op, "Group deletion failed.")
    }
    return organizationCollectionRevisionUpdate(database, affectedResult.data, revisionDate)
  })
  if (!result.success) return result
  return resultCreate(undefined)
}
