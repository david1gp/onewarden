import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationPolicy } from "./organizationPolicy.js"
import { organizationPolicyFromRow } from "./organizationPolicyFromRow.js"
import type { OrganizationPolicyRow } from "./organizationPolicyRow.js"

export function organizationPolicyFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationPolicy[]> {
  const op = "organizationPolicyFindByOrganization"
  try {
    const rows = database
      .query<OrganizationPolicyRow, [string]>(
        `SELECT uuid, org_uuid, atype, enabled, data, revision_date
         FROM org_policies
         WHERE org_uuid = ?`,
      )
      .all(organizationUuid)
    const policies: OrganizationPolicy[] = []
    for (const row of rows) {
      const policy = organizationPolicyFromRow(row)
      if (policy === undefined) return resultErrorCreate(op, "Organization policy type is unsupported.")
      policies.push(policy)
    }
    return resultCreate(policies)
  } catch {
    return resultErrorCreate(op, "Organization policy lookup failed.")
  }
}
