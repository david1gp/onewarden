import type { Result } from "#result"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionAssignmentsReplace } from "./organizationCollectionAssignmentsReplace.js"
import { organizationCollectionExternalIdNormalize } from "./organizationCollectionExternalIdNormalize.js"
import { organizationCollectionSave } from "./organizationCollectionSave.js"
import type { OrganizationCollectionData } from "./organizationCollectionDataSchema.js"

export function organizationCollectionCreate(
  database: DatabaseConnection,
  organizationUuid: string,
  name: string,
  externalId: string | null | undefined,
  revisionDate: string,
  identifier: Identifier,
  assignments?: Pick<OrganizationCollectionData, "groups" | "users">,
): Result<OrganizationCollection> {
  const collection: OrganizationCollection = {
    externalId: organizationCollectionExternalIdNormalize(externalId),
    name,
    organizationUuid,
    uuid: identifier.uuid(),
  }
  const saveResult = organizationCollectionSave(database, collection, revisionDate)
  if (!saveResult.success) return saveResult
  if (assignments !== undefined) {
    const assignmentResult = organizationCollectionAssignmentsReplace(
      database,
      organizationUuid,
      collection.uuid,
      assignments.groups,
      assignments.users,
      revisionDate,
    )
    if (!assignmentResult.success) return assignmentResult
  }
  return resultCreate(collection)
}
