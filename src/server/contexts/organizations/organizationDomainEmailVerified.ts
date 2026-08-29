import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationDomainEmailVerified(
  database: DatabaseConnection,
  organizationUuid: string,
  email: string,
): Result<boolean> {
  const op = "organizationDomainEmailVerified"
  try {
    const row = database
      .query<{ count: number }, [string, string]>(
        `SELECT COUNT(*) AS count
         FROM organization_domains
         WHERE org_uuid = ?
           AND verified_date IS NOT NULL
           AND lower(?) LIKE '%@' || lower(domain_name)`,
      )
      .get(organizationUuid, email.toLowerCase())
    return resultCreate((row?.count ?? 0) > 0)
  } catch {
    return resultErrorCreate(op, "Organization domain lookup failed.")
  }
}
