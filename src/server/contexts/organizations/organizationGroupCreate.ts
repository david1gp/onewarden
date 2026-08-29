import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationGroup } from "./organizationGroup.js"
import { organizationGroupExternalIdNormalize } from "./organizationGroupExternalIdNormalize.js"
import { organizationGroupSave } from "./organizationGroupSave.js"

export function organizationGroupCreate(
  database: DatabaseConnection,
  organizationUuid: string,
  name: string,
  accessAll: boolean,
  externalId: string | null | undefined,
  clock: Clock,
  identifier: Identifier,
): Result<OrganizationGroup> {
  const timestamp = clock.now().toISOString()
  const group: OrganizationGroup = {
    accessAll,
    createdAt: timestamp,
    externalId: organizationGroupExternalIdNormalize(externalId),
    name,
    organizationUuid,
    revisionDate: timestamp,
    uuid: identifier.uuid(),
  }
  const saveResult = organizationGroupSave(database, group, timestamp)
  if (!saveResult.success) return saveResult
  return resultCreate(group)
}
