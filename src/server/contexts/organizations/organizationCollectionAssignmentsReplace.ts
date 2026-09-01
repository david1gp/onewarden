import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { eq } from "drizzle-orm"
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
    database.drizzle.delete(usersCollections).where(eq(usersCollections.collectionUuid, collectionUuid)).run()
    database.drizzle.delete(collectionsGroups).where(eq(collectionsGroups.collectionsUuid, collectionUuid)).run()
    for (const group of groups) {
      database.drizzle
        .insert(collectionsGroups)
        .values({
          collectionsUuid: collectionUuid,
          groupsUuid: group.id,
          readOnly: group.readOnly,
          hidePasswords: group.hidePasswords,
          manage: group.manage,
        })
        .run()
    }
    const userTargets = new Map(targetsResult.data.userTargets.map((target) => [target.membershipUuid, target]))
    for (const user of users) {
      const target = userTargets.get(user.id)
      if (target === undefined || target.accessAll) continue
      database.drizzle
        .insert(usersCollections)
        .values({
          userUuid: target.userUuid,
          collectionUuid,
          readOnly: user.readOnly,
          hidePasswords: user.hidePasswords,
          manage: user.manage,
        })
        .run()
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
