import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionAssignmentsReplace } from "./organizationCollectionAssignmentsReplace.js"
import type { OrganizationCollectionData } from "./organizationCollectionDataSchema.js"
import { organizationCollectionExternalIdNormalize } from "./organizationCollectionExternalIdNormalize.js"
import { organizationCollectionFindByUuidAndOrganization } from "./organizationCollectionFindByUuidAndOrganization.js"
import { organizationCollectionSave } from "./organizationCollectionSave.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"

export function organizationCollectionUpdate(
  database: DatabaseConnection,
  organizationUuid: string,
  collectionUuid: string,
  name: string,
  externalId: string | null | undefined,
  clock: Clock,
  assignments?: Pick<OrganizationCollectionData, "groups" | "users">,
): Result<OrganizationCollection> {
  const collectionResult = organizationCollectionFindByUuidAndOrganization(database, collectionUuid, organizationUuid)
  if (!collectionResult.success) return collectionResult
  if (collectionResult.data === null)
    return organizationErrorCreate("organizationCollectionUpdate", "Collection not found")

  const collection: OrganizationCollection = {
    ...collectionResult.data,
    externalId: organizationCollectionExternalIdNormalize(externalId, true),
    name,
  }
  const revisionDate = clock.now().toISOString()
  const saveResult = organizationCollectionSave(database, collection, revisionDate)
  if (!saveResult.success) return saveResult
  if (assignments !== undefined) {
    const assignmentResult = organizationCollectionAssignmentsReplace(
      database,
      organizationUuid,
      collectionUuid,
      assignments.groups,
      assignments.users,
      revisionDate,
    )
    if (!assignmentResult.success) return assignmentResult
  }
  return resultCreate(collection)
}
