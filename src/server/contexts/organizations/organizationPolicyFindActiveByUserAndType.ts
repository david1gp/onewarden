import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq, gt } from "drizzle-orm"
import { organizationPolicies, type OrganizationPolicyRow } from "../../database/schema/organizationPolicies.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { OrganizationPolicy, OrganizationPolicyType } from "./organizationPolicy.js"
import { organizationPolicyFromRow } from "./organizationPolicyFromRow.js"

export function organizationPolicyFindActiveByUserAndType(
  database: DatabaseConnection,
  userUuid: string,
  type: OrganizationPolicyType,
): Result<OrganizationPolicy[]> {
  const op = "organizationPolicyFindActiveByUserAndType"
  try {
    const rows: OrganizationPolicyRow[] = database.drizzle
      .select({
        atype: organizationPolicies.atype,
        data: organizationPolicies.data,
        enabled: organizationPolicies.enabled,
        orgUuid: organizationPolicies.orgUuid,
        revisionDate: organizationPolicies.revisionDate,
        uuid: organizationPolicies.uuid,
      })
      .from(organizationPolicies)
      .innerJoin(
        usersOrganizations,
        and(eq(usersOrganizations.orgUuid, organizationPolicies.orgUuid), eq(usersOrganizations.userUuid, userUuid)),
      )
      .where(
        and(
          eq(organizationPolicies.atype, type),
          eq(organizationPolicies.enabled, true),
          eq(usersOrganizations.status, 2),
          gt(usersOrganizations.atype, 1),
        ),
      )
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
