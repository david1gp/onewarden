import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { asc, eq } from "drizzle-orm"
import { organizationDomains, type OrganizationDomainRow } from "../../database/schema/organizationDomains.js"
import type { OrganizationDomain } from "./organizationDomain.js"
import { organizationDomainFromRow } from "./organizationDomainFromRow.js"

export function organizationDomainFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationDomain[]> {
  const op = "organizationDomainFindByOrganization"
  try {
    const rows: OrganizationDomainRow[] = database.drizzle
      .select()
      .from(organizationDomains)
      .where(eq(organizationDomains.orgUuid, organizationUuid))
      .orderBy(asc(organizationDomains.domainName))
      .all()
    return resultCreate(rows.map(organizationDomainFromRow))
  } catch {
    return resultErrorCreate(op, "Organization domain lookup failed.")
  }
}
