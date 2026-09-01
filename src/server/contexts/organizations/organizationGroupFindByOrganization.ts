import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { asc, eq } from "drizzle-orm"
import { groups, type GroupRow } from "../../database/schema/groups.js"
import type { OrganizationGroup } from "./organizationGroup.js"
import { organizationGroupFromRow } from "./organizationGroupFromRow.js"

export function organizationGroupFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationGroup[]> {
  const op = "organizationGroupFindByOrganization"
  try {
    const rows: GroupRow[] = database.drizzle
      .select()
      .from(groups)
      .where(eq(groups.organizationsUuid, organizationUuid))
      .orderBy(asc(groups.uuid))
      .all()
    return resultCreate(rows.map(organizationGroupFromRow))
  } catch {
    return resultErrorCreate(op, "Group lookup failed.")
  }
}
