import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, asc, eq, isNotNull, sql } from "drizzle-orm"
import { organizationDomains } from "../../database/schema/organizationDomains.js"
import { organizations } from "../../database/schema/organizations.js"
import type { OrganizationDomainVerifiedSsoDetail } from "./organizationDomainVerifiedSsoDetail.js"

export function organizationDomainFindVerifiedByEmail(
  database: DatabaseConnection,
  email: string,
): Result<OrganizationDomainVerifiedSsoDetail[]> {
  const op = "organizationDomainFindVerifiedByEmail"
  try {
    const rows = database.drizzle
      .select({
        domainName: organizationDomains.domainName,
        organizationIdentifier: organizations.identifier,
        organizationName: organizations.name,
      })
      .from(organizationDomains)
      .innerJoin(organizations, eq(organizations.uuid, organizationDomains.orgUuid))
      .where(
        and(
          isNotNull(organizationDomains.verifiedDate),
          sql`lower(${email.toLowerCase()}) LIKE '%' || '@' || lower(${organizationDomains.domainName})`,
        ),
      )
      .orderBy(asc(organizationDomains.domainName))
      .all()
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Organization domain lookup failed.")
  }
}
