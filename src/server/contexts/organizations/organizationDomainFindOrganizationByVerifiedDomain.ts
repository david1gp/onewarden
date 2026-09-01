import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, asc, isNotNull, sql } from "drizzle-orm"
import { organizationDomains } from "../../database/schema/organizationDomains.js"

export function organizationDomainFindOrganizationByVerifiedDomain(
  database: DatabaseConnection,
  domainName: string,
): Result<string | null> {
  const op = "organizationDomainFindOrganizationByVerifiedDomain"
  try {
    const rows = database.drizzle
      .selectDistinct({ organizationUuid: organizationDomains.orgUuid })
      .from(organizationDomains)
      .where(
        and(
          isNotNull(organizationDomains.verifiedDate),
          sql`lower(${organizationDomains.domainName}) = lower(${domainName})`,
        ),
      )
      .orderBy(asc(organizationDomains.orgUuid))
      .limit(2)
      .all()
    if (rows.length > 1) return resultErrorCreate(op, "The verified organization domain is ambiguous.")
    return resultCreate(rows[0]?.organizationUuid ?? null)
  } catch {
    return resultErrorCreate(op, "Organization domain lookup failed.")
  }
}
