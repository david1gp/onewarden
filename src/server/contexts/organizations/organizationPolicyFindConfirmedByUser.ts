import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { organizationPolicies, type OrganizationPolicyRow } from "../../database/schema/organizationPolicies.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { OrganizationPolicy } from "./organizationPolicy.js"
import { organizationPolicyFromRow } from "./organizationPolicyFromRow.js"

export function organizationPolicyFindConfirmedByUser(
  database: DatabaseConnection,
  userUuid: string,
): Result<OrganizationPolicy[]> {
  const op = "organizationPolicyFindConfirmedByUser"
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
      .where(eq(usersOrganizations.status, 2))
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
