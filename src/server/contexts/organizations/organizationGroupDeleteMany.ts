import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { organizationCollectionRevisionUpdate } from "./organizationCollectionRevisionUpdate.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationGroupAffectedUserUuidsFind } from "./organizationGroupAffectedUserUuidsFind.js"
import type { OrganizationGroup } from "./organizationGroup.js"
import { organizationGroupFindByUuidAndOrganization } from "./organizationGroupFindByUuidAndOrganization.js"

export function organizationGroupDeleteMany(
  database: DatabaseConnection,
  organizationUuid: string,
  groupUuids: readonly string[],
  revisionDate: string,
): Result<void> {
  const groups: OrganizationGroup[] = []
  const seen = new Set<string>()
  const affectedUserUuids = new Set<string>()

  for (const groupUuid of groupUuids) {
    if (seen.has(groupUuid)) continue
    seen.add(groupUuid)
    const groupResult = organizationGroupFindByUuidAndOrganization(database, groupUuid, organizationUuid)
    if (!groupResult.success) return groupResult
    if (groupResult.data === null) return organizationErrorCreate("organizationGroupDeleteMany", "Group not found")
    groups.push(groupResult.data)
    const affectedResult = organizationGroupAffectedUserUuidsFind(database, organizationUuid, groupUuid)
    if (!affectedResult.success) return affectedResult
    for (const userUuid of affectedResult.data) affectedUserUuids.add(userUuid)
  }

  const result = databaseTransaction(database, () => {
    try {
      for (const group of groups) {
        database.run("DELETE FROM collections_groups WHERE groups_uuid = ?", [group.uuid])
        database.run("DELETE FROM groups_users WHERE groups_uuid = ?", [group.uuid])
        database.run("DELETE FROM groups WHERE uuid = ? AND organizations_uuid = ?", [group.uuid, organizationUuid])
      }
    } catch {
      return resultErrorCreate("organizationGroupDeleteMany", "Group deletion failed.")
    }
    return organizationCollectionRevisionUpdate(database, [...affectedUserUuids], revisionDate)
  })
  if (!result.success) return result
  return resultCreate(undefined)
}
