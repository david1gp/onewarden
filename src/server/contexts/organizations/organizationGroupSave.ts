import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationGroup } from "./organizationGroup.js"

export function organizationGroupSave(
  database: DatabaseConnection,
  group: OrganizationGroup,
  revisionDate: string,
): Result<void> {
  const op = "organizationGroupSave"
  try {
    database.run(
      `INSERT INTO groups (
         uuid, organizations_uuid, name, access_all, external_id, creation_date, revision_date
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         organizations_uuid = excluded.organizations_uuid,
         name = excluded.name,
         access_all = excluded.access_all,
         external_id = excluded.external_id,
         revision_date = excluded.revision_date`,
      [
        group.uuid,
        group.organizationUuid,
        group.name,
        group.accessAll ? 1 : 0,
        group.externalId,
        group.createdAt,
        revisionDate,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Group save failed.")
  }
}
