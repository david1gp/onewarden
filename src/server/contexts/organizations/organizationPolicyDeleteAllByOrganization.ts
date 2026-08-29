import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationPolicyDeleteAllByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<void> {
  const op = "organizationPolicyDeleteAllByOrganization"
  try {
    database.run("DELETE FROM org_policies WHERE org_uuid = ?", [organizationUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization policy deletion failed.")
  }
}
