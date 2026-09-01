import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { organizationDomains } from "../../database/schema/organizationDomains.js"

export function organizationDomainDelete(
  database: DatabaseConnection,
  uuid: string,
  organizationUuid: string,
): Result<void> {
  const op = "organizationDomainDelete"
  try {
    database.drizzle
      .delete(organizationDomains)
      .where(and(eq(organizationDomains.uuid, uuid), eq(organizationDomains.orgUuid, organizationUuid)))
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization domain deletion failed.")
  }
}
