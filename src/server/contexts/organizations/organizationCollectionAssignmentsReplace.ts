import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollectionAccessData } from "./organizationCollectionAccessDataSchema.js"
import { organizationCollectionAffectedUserUuidsFind } from "./organizationCollectionAffectedUserUuidsFind.js"
import { organizationCollectionAssignmentsResolve } from "./organizationCollectionAssignmentsResolve.js"
import { organizationCollectionRevisionUpdate } from "./organizationCollectionRevisionUpdate.js"

export function organizationCollectionAssignmentsReplace(
  database: DatabaseConnection,
  organizationUuid: string,
  collectionUuid: string,
  groups: readonly OrganizationCollectionAccessData[],
  users: readonly OrganizationCollectionAccessData[],
  revisionDate: string,
): Result<void> {
  const targetsResult = organizationCollectionAssignmentsResolve(database, organizationUuid, groups, users)
  if (!targetsResult.success) return targetsResult

  const beforeResult = organizationCollectionAffectedUserUuidsFind(database, organizationUuid, collectionUuid)
  if (!beforeResult.success) return beforeResult

  try {
    database.run("DELETE FROM users_collections WHERE collection_uuid = ?", [collectionUuid])
    database.run("DELETE FROM collections_groups WHERE collections_uuid = ?", [collectionUuid])
    for (const group of groups) {
      database.run(
        `INSERT INTO collections_groups (collections_uuid, groups_uuid, read_only, hide_passwords, manage)
         VALUES (?, ?, ?, ?, ?)`,
        [collectionUuid, group.id, group.readOnly ? 1 : 0, group.hidePasswords ? 1 : 0, group.manage ? 1 : 0],
      )
    }
    const userTargets = new Map(targetsResult.data.userTargets.map((target) => [target.membershipUuid, target]))
    for (const user of users) {
      const target = userTargets.get(user.id)
      if (target === undefined || target.accessAll) continue
      database.run(
        `INSERT INTO users_collections (user_uuid, collection_uuid, read_only, hide_passwords, manage)
         VALUES (?, ?, ?, ?, ?)`,
        [target.userUuid, collectionUuid, user.readOnly ? 1 : 0, user.hidePasswords ? 1 : 0, user.manage ? 1 : 0],
      )
    }
  } catch {
    return resultErrorCreate("organizationCollectionAssignmentsReplace", "Collection access update failed.")
  }

  const afterResult = organizationCollectionAffectedUserUuidsFind(database, organizationUuid, collectionUuid)
  if (!afterResult.success) return afterResult
  const userUuids = [...new Set([...beforeResult.data, ...afterResult.data])]
  const revisionResult = organizationCollectionRevisionUpdate(database, userUuids, revisionDate)
  if (!revisionResult.success) return revisionResult
  return resultCreate(undefined)
}
