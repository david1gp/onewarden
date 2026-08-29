import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
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
      database.run("DELETE FROM collections_groups WHERE groups_uuid = ?", [group.uuid])
      database.run("DELETE FROM groups_users WHERE groups_uuid = ?", [group.uuid])
      database.run("DELETE FROM groups WHERE uuid = ? AND organizations_uuid = ?", [group.uuid, group.organizationUuid])
    } catch {
      return resultErrorCreate(op, "Group deletion failed.")
    }
    return organizationCollectionRevisionUpdate(database, affectedResult.data, revisionDate)
  })
  if (!result.success) return result
  return resultCreate(undefined)
}
