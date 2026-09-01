import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, count, eq, isNotNull, sql } from "drizzle-orm"
import { organizationDomains } from "../../database/schema/organizationDomains.js"

export function organizationDomainEmailVerified(
  database: DatabaseConnection,
  organizationUuid: string,
  email: string,
): Result<boolean> {
  const op = "organizationDomainEmailVerified"
  try {
    const row = database.drizzle
      .select({ count: count() })
      .from(organizationDomains)
      .where(
        and(
          eq(organizationDomains.orgUuid, organizationUuid),
          isNotNull(organizationDomains.verifiedDate),
          sql`lower(${email.toLowerCase()}) LIKE '%' || '@' || lower(${organizationDomains.domainName})`,
        ),
      )
      .get()
    return resultCreate((row?.count ?? 0) > 0)
  } catch {
    return resultErrorCreate(op, "Organization domain lookup failed.")
  }
}
