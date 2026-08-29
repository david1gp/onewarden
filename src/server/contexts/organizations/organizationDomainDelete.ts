import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationDomainDelete(
  database: DatabaseConnection,
  uuid: string,
  organizationUuid: string,
): Result<void> {
  const op = "organizationDomainDelete"
  try {
    database.run("DELETE FROM organization_domains WHERE uuid = ? AND org_uuid = ?", [uuid, organizationUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization domain deletion failed.")
  }
}
