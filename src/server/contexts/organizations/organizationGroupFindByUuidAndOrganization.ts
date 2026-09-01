import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { groups, type GroupRow } from "../../database/schema/groups.js"
import type { OrganizationGroup } from "./organizationGroup.js"
import { organizationGroupFromRow } from "./organizationGroupFromRow.js"

export function organizationGroupFindByUuidAndOrganization(
  database: DatabaseConnection,
  groupUuid: string,
  organizationUuid: string,
): Result<OrganizationGroup | null> {
  const op = "organizationGroupFindByUuidAndOrganization"
  try {
    const row: GroupRow | undefined = database.drizzle
      .select()
      .from(groups)
      .where(and(eq(groups.uuid, groupUuid), eq(groups.organizationsUuid, organizationUuid)))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : organizationGroupFromRow(row))
  } catch {
    return resultErrorCreate(op, "Group lookup failed.")
  }
}
