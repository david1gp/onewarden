import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationPolicy } from "./organizationPolicy.js"

export function organizationPolicySave(database: DatabaseConnection, policy: OrganizationPolicy): Result<void> {
  const op = "organizationPolicySave"
  try {
    database.run(
      `INSERT INTO org_policies (uuid, org_uuid, atype, enabled, data, revision_date)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(org_uuid, atype) DO UPDATE SET
          enabled = excluded.enabled,
          data = excluded.data,
          revision_date = excluded.revision_date`,
      [policy.uuid, policy.organizationUuid, policy.type, policy.enabled ? 1 : 0, policy.data, policy.revisionDate],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization policy save failed.")
  }
}
