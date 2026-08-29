import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationPolicyDelete(database: DatabaseConnection, policyUuid: string): Result<void> {
  const op = "organizationPolicyDelete"
  try {
    database.run("DELETE FROM org_policies WHERE uuid = ?", [policyUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization policy deletion failed.")
  }
}
