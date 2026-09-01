import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { organizationDomains, type OrganizationDomainRow } from "../../database/schema/organizationDomains.js"
import type { OrganizationDomain } from "./organizationDomain.js"
import { organizationDomainFromRow } from "./organizationDomainFromRow.js"

export function organizationDomainFindByUuidAndOrganization(
  database: DatabaseConnection,
  uuid: string,
  organizationUuid: string,
): Result<OrganizationDomain | null> {
  const op = "organizationDomainFindByUuidAndOrganization"
  try {
    const row: OrganizationDomainRow | undefined = database.drizzle
      .select()
      .from(organizationDomains)
      .where(and(eq(organizationDomains.uuid, uuid), eq(organizationDomains.orgUuid, organizationUuid)))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : organizationDomainFromRow(row))
  } catch {
    return resultErrorCreate(op, "Organization domain lookup failed.")
  }
}
