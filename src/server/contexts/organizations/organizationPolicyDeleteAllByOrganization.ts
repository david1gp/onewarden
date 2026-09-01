import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq } from "drizzle-orm"
import { organizationPolicies } from "../../database/schema/organizationPolicies.js"

export function organizationPolicyDeleteAllByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<void> {
  const op = "organizationPolicyDeleteAllByOrganization"
  try {
    database.drizzle.delete(organizationPolicies).where(eq(organizationPolicies.orgUuid, organizationUuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization policy deletion failed.")
  }
}
