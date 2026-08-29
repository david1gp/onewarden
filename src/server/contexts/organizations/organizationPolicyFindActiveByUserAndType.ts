import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationPolicy, OrganizationPolicyType } from "./organizationPolicy.js"
import { organizationPolicyFromRow } from "./organizationPolicyFromRow.js"
import type { OrganizationPolicyRow } from "./organizationPolicyRow.js"

export function organizationPolicyFindActiveByUserAndType(
  database: DatabaseConnection,
  userUuid: string,
  type: OrganizationPolicyType,
): Result<OrganizationPolicy[]> {
  const op = "organizationPolicyFindActiveByUserAndType"
  try {
    const rows = database
      .query<OrganizationPolicyRow, [string, number]>(
        `SELECT policy.uuid, policy.org_uuid, policy.atype, policy.enabled, policy.data, policy.revision_date
         FROM org_policies AS policy
         JOIN users_organizations AS member ON member.org_uuid = policy.org_uuid
           AND member.user_uuid = ?
          WHERE policy.atype = ?
            AND policy.enabled = 1
            AND member.status = 2
           AND member.atype > 1`,
      )
      .all(userUuid, type)
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
