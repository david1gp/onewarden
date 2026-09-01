import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationPolicies } from "../../database/schema/organizationPolicies.js"
import type { OrganizationPolicy } from "./organizationPolicy.js"

export function organizationPolicySave(database: DatabaseConnection, policy: OrganizationPolicy): Result<void> {
  const op = "organizationPolicySave"
  try {
    database.drizzle
      .insert(organizationPolicies)
      .values({
        uuid: policy.uuid,
        orgUuid: policy.organizationUuid,
        atype: policy.type,
        enabled: policy.enabled,
        data: policy.data,
        revisionDate: policy.revisionDate,
      })
      .onConflictDoUpdate({
        target: [organizationPolicies.orgUuid, organizationPolicies.atype],
        set: { enabled: policy.enabled, data: policy.data, revisionDate: policy.revisionDate },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization policy save failed.")
  }
}
