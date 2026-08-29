import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationPolicy } from "./organizationPolicy.js"
import { organizationPolicyFromRow } from "./organizationPolicyFromRow.js"
import type { OrganizationPolicyRow } from "./organizationPolicyRow.js"

export function organizationPolicyFindConfirmedByUser(
  database: DatabaseConnection,
  userUuid: string,
): Result<OrganizationPolicy[]> {
  const op = "organizationPolicyFindConfirmedByUser"
  try {
    const rows = database
      .query<OrganizationPolicyRow, [string]>(
        `SELECT policy.uuid, policy.org_uuid, policy.atype, policy.enabled, policy.data, policy.revision_date
         FROM org_policies AS policy
         JOIN users_organizations AS member ON member.org_uuid = policy.org_uuid
           AND member.user_uuid = ?
         WHERE member.status = 2`,
      )
      .all(userUuid)
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
