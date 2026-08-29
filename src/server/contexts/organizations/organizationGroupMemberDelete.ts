import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationCollectionRevisionUpdate } from "./organizationCollectionRevisionUpdate.js"
import { organizationGroupAffectedUserUuidsFind } from "./organizationGroupAffectedUserUuidsFind.js"

export function organizationGroupMemberDelete(
  database: DatabaseConnection,
  organizationUuid: string,
  groupUuid: string,
  membershipUuid: string,
  clock: Clock,
): Result<void> {
  const op = "organizationGroupMemberDelete"
  const beforeResult = organizationGroupAffectedUserUuidsFind(database, organizationUuid, groupUuid)
  if (!beforeResult.success) return beforeResult
  try {
    database.run(
      `DELETE FROM groups_users
       WHERE groups_uuid = ? AND users_organizations_uuid = ?`,
      [groupUuid, membershipUuid],
    )
  } catch {
    return resultErrorCreate(op, "Group member deletion failed.")
  }
  const afterResult = organizationGroupAffectedUserUuidsFind(database, organizationUuid, groupUuid)
  if (!afterResult.success) return afterResult
  const userUuids = [...new Set([...beforeResult.data, ...afterResult.data])]
  const revisionResult = organizationCollectionRevisionUpdate(database, userUuids, clock.now().toISOString())
  if (!revisionResult.success) return revisionResult
  return resultCreate(undefined)
}
