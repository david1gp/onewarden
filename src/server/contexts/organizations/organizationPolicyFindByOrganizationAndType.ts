import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { organizationPolicies, type OrganizationPolicyRow } from "../../database/schema/organizationPolicies.js"
import type { OrganizationPolicy, OrganizationPolicyType } from "./organizationPolicy.js"
import { organizationPolicyFromRow } from "./organizationPolicyFromRow.js"

export function organizationPolicyFindByOrganizationAndType(
  database: DatabaseConnection,
  organizationUuid: string,
  type: OrganizationPolicyType,
): Result<OrganizationPolicy | null> {
  const op = "organizationPolicyFindByOrganizationAndType"
  try {
    const row: OrganizationPolicyRow | undefined = database.drizzle
      .select()
      .from(organizationPolicies)
      .where(and(eq(organizationPolicies.orgUuid, organizationUuid), eq(organizationPolicies.atype, type)))
      .limit(1)
      .get()
    if (row === undefined) return resultCreate(null)
    const policy = organizationPolicyFromRow(row)
    if (policy === undefined) return resultErrorCreate(op, "Organization policy type is unsupported.")
    return resultCreate(policy)
  } catch {
    return resultErrorCreate(op, "Organization policy lookup failed.")
  }
}
