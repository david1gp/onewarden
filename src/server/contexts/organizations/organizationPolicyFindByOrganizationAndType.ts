import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationPolicy, OrganizationPolicyType } from "./organizationPolicy.js"
import { organizationPolicyFromRow } from "./organizationPolicyFromRow.js"
import type { OrganizationPolicyRow } from "./organizationPolicyRow.js"

export function organizationPolicyFindByOrganizationAndType(
  database: DatabaseConnection,
  organizationUuid: string,
  type: OrganizationPolicyType,
): Result<OrganizationPolicy | null> {
  const op = "organizationPolicyFindByOrganizationAndType"
  try {
    const row = database
      .query<OrganizationPolicyRow, [string, number]>(
        `SELECT uuid, org_uuid, atype, enabled, data, revision_date
         FROM org_policies
         WHERE org_uuid = ? AND atype = ?
         LIMIT 1`,
      )
      .get(organizationUuid, type)
    if (row === null) return resultCreate(null)
    const policy = organizationPolicyFromRow(row)
    if (policy === undefined) return resultErrorCreate(op, "Organization policy type is unsupported.")
    return resultCreate(policy)
  } catch {
    return resultErrorCreate(op, "Organization policy lookup failed.")
  }
}
