import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq } from "drizzle-orm"
import { organizationPolicies, type OrganizationPolicyRow } from "../../database/schema/organizationPolicies.js"
import type { OrganizationPolicy } from "./organizationPolicy.js"
import { organizationPolicyFromRow } from "./organizationPolicyFromRow.js"

export function organizationPolicyFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationPolicy[]> {
  const op = "organizationPolicyFindByOrganization"
  try {
    const rows: OrganizationPolicyRow[] = database.drizzle
      .select()
      .from(organizationPolicies)
      .where(eq(organizationPolicies.orgUuid, organizationUuid))
      .all()
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
