import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationDomainFindOrganizationByVerifiedDomain(
  database: DatabaseConnection,
  domainName: string,
): Result<string | null> {
  const op = "organizationDomainFindOrganizationByVerifiedDomain"
  try {
    const rows = database
      .query<{ organization_uuid: string }, [string]>(
        `SELECT DISTINCT org_uuid AS organization_uuid
         FROM organization_domains
         WHERE verified_date IS NOT NULL AND lower(domain_name) = lower(?)
         ORDER BY organization_uuid
         LIMIT 2`,
      )
      .all(domainName)
    if (rows.length > 1) return resultErrorCreate(op, "The verified organization domain is ambiguous.")
    return resultCreate(rows[0]?.organization_uuid ?? null)
  } catch {
    return resultErrorCreate(op, "Organization domain lookup failed.")
  }
}
