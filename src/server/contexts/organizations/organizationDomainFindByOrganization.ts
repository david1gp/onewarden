import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationDomain } from "./organizationDomain.js"
import { organizationDomainFromRow } from "./organizationDomainFromRow.js"
import type { OrganizationDomainRow } from "./organizationDomainRow.js"

export function organizationDomainFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationDomain[]> {
  const op = "organizationDomainFindByOrganization"
  try {
    const rows = database
      .query<OrganizationDomainRow, [string]>(
        `SELECT uuid, org_uuid, txt, domain_name, creation_date, next_run_date,
                job_run_count, verified_date, last_checked_date
         FROM organization_domains WHERE org_uuid = ? ORDER BY domain_name`,
      )
      .all(organizationUuid)
    return resultCreate(rows.map(organizationDomainFromRow))
  } catch {
    return resultErrorCreate(op, "Organization domain lookup failed.")
  }
}
